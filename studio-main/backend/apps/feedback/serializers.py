from rest_framework import serializers
from .models import Feedback, FeedbackResponse


class FeedbackResponseSerializer(serializers.ModelSerializer):
    responder_name = serializers.CharField(source='responder.get_full_name', read_only=True)

    class Meta:
        model = FeedbackResponse
        fields = ['id', 'responder', 'responder_name', 'message', 'created_at']


class FeedbackListSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)

    class Meta:
        model = Feedback
        fields = ['id', 'subject', 'sender_name', 'status', 'priority', 'created_at']


class FeedbackDetailSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    responses = FeedbackResponseSerializer(many=True, read_only=True)

    class Meta:
        model = Feedback
        fields = ['id', 'subject', 'message', 'sender', 'sender_name', 'status', 'priority',
                  'resolved_by', 'resolved_by_name', 'resolved_at', 'resolution_note',
                  'attachment', 'created_at', 'responses']


class FeedbackCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['subject', 'message', 'priority', 'attachment']

    def create(self, validated_data):
        validated_data['sender'] = self.context['request'].user
        validated_data['school'] = self.context['request'].user.school
        return super().create(validated_data)


class FeedbackResolveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['status', 'resolution_note']

    def validate(self, data):
        if data.get('status') == 'Resolved' and not data.get('resolution_note'):
            raise serializers.ValidationError("resolution_note is required when resolving feedback")
        return data

    def update(self, instance, validated_data):
        instance.status = validated_data.get('status', instance.status)
        instance.resolution_note = validated_data.get('resolution_note', instance.resolution_note)
        instance.resolved_by = self.context['request'].user
        from django.utils import timezone
        instance.resolved_at = timezone.now()
        instance.save()
        return instance
