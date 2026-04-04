from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from users.models import User
from .models import Conversation, ConversationParticipant, Message


class ParticipantSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_avatar = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = ConversationParticipant
        fields = ['user_id', 'user_name', 'user_avatar', 'user_email', 'role', 'joined_at', 'is_muted', 'last_read_at']
        read_only_fields = ['joined_at', 'last_read_at']

    def get_user_avatar(self, obj):
        if obj.user.avatar:
            return obj.user.avatar.url
        return None


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_avatar = serializers.SerializerMethodField()
    reply_to_text = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender_id', 'sender_name', 'sender_avatar', 'text',
            'message_type', 'attachment', 'is_official', 'created_at',
            'is_read', 'read_at', 'reply_to', 'reply_to_text', 'is_deleted'
        ]
        read_only_fields = ['id', 'sender_id', 'sender_name', 'sender_avatar', 'created_at', 'is_read', 'read_at', 'is_deleted']

    def get_sender_avatar(self, obj):
        if obj.sender and obj.sender.avatar:
            return obj.sender.avatar.url
        return None

    def get_reply_to_text(self, obj):
        if obj.reply_to and not obj.reply_to.is_deleted:
            return obj.reply_to.text[:100]
        return None


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['text', 'message_type', 'attachment', 'reply_to']

    def validate(self, data):
        if not data.get('text') and not data.get('attachment'):
            raise serializers.ValidationError(
                _('Either text or attachment must be provided.')
            )
        return data


class ConversationListSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    participant_count = serializers.IntegerField(source='participants.count', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Conversation
        fields = [
            'id', 'name', 'conversation_type', 'participants', 'participant_count',
            'last_message', 'last_message_at', 'unread_count', 'created_by_name',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_participants(self, obj):
        """Get first 3 participants."""
        participants = obj.participants.all()[:3]
        return [
            {
                'id': p.id,
                'name': p.get_full_name(),
                'avatar': p.avatar.url if p.avatar else None
            }
            for p in participants
        ]

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.get_unread_count(request.user)
        return 0


class ConversationDetailSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(
        source='participant_records',
        many=True,
        read_only=True
    )
    recent_messages = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Conversation
        fields = [
            'id', 'name', 'conversation_type', 'school', 'created_by', 'created_by_name',
            'participants', 'last_message', 'last_message_at', 'is_active',
            'created_at', 'updated_at', 'recent_messages'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_recent_messages(self, obj):
        """Get 20 most recent messages."""
        messages = obj.messages.filter(is_deleted=False).order_by('-created_at')[:20]
        return MessageSerializer(messages, many=True, context=self.context).data


class ConversationCreateSerializer(serializers.ModelSerializer):
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=True
    )

    class Meta:
        model = Conversation
        fields = ['name', 'conversation_type', 'school', 'participant_ids']

    def validate_participant_ids(self, value):
        if not value:
            raise serializers.ValidationError(_('At least one participant is required.'))

        # Validate all users exist
        users = User.objects.filter(id__in=value)
        if len(users) != len(value):
            raise serializers.ValidationError(_('Some participants do not exist.'))

        return value

    def create(self, validated_data):
        participant_ids = validated_data.pop('participant_ids')
        request = self.context.get('request')

        # Create conversation
        conversation = Conversation.objects.create(
            created_by=request.user,
            **validated_data
        )

        # Add participants
        for user_id in participant_ids:
            user = User.objects.get(id=user_id)
            conversation.add_participant(user, role='member')

        # Add creator as admin
        conversation.add_participant(request.user, role='admin')

        return conversation
