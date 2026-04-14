from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import CursorPagination
from django.db.models import Q, Prefetch, Count
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext_lazy as _

from .models import Conversation, ConversationParticipant, Message
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    ConversationCreateSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    ParticipantSerializer
)
from .tasks import send_offline_notification
from apps.users.models import User


class MessageCursorPagination(CursorPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100
    ordering = '-created_at'


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get conversations for current user."""
        user = self.request.user
        return Conversation.objects.filter(
            participants=user,
            is_active=True
        ).prefetch_related(
            Prefetch(
                'participant_records',
                ConversationParticipant.objects.select_related('user')
            ),
            'participants',
            Prefetch(
                'messages',
                Message.objects.filter(is_deleted=False).order_by('-created_at')[:20]
            )
        ).order_by('-last_message_at', '-created_at').distinct()

    def get_serializer_class(self):
        if self.action == 'list':
            return ConversationListSerializer
        elif self.action == 'create':
            return ConversationCreateSerializer
        return ConversationDetailSerializer

    def list(self, request, *args, **kwargs):
        """List user's conversations."""
        queryset = self.get_queryset()

        # Filter by conversation type if provided
        conversation_type = request.query_params.get('type')
        if conversation_type:
            queryset = queryset.filter(conversation_type=conversation_type)

        # Search by name or participant name
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(participants__name__icontains=search)
            ).distinct()

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Create a new conversation (DM or group chat)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = serializer.save()

        return Response(
            ConversationDetailSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    def retrieve(self, request, *args, **kwargs):
        """Get conversation detail with recent messages."""
        conversation = self.get_object()
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='get-or-create-direct')
    def get_or_create_direct(self, request):
        """Get or create a direct message conversation with another user."""
        other_user_id = request.data.get('user_id')

        if not other_user_id:
            return Response(
                {'error': _('user_id is required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response(
                {'error': _('User not found')},
                status=status.HTTP_404_NOT_FOUND
            )

        if other_user == request.user:
            return Response(
                {'error': _('Cannot create conversation with yourself')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if conversation already exists
        conversation = Conversation.objects.filter(
            conversation_type='direct',
            participants=request.user
        ).filter(participants=other_user).first()

        if not conversation:
            # Create new direct conversation
            conversation = Conversation.objects.create(
                conversation_type='direct',
                created_by=request.user
            )
            conversation.add_participant(request.user, role='admin')
            conversation.add_participant(other_user, role='member')

        serializer = ConversationDetailSerializer(conversation, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='messages')
    def messages(self, request, pk=None):
        """Get paginated message history for a conversation."""
        conversation = self.get_object()

        queryset = conversation.messages.filter(is_deleted=False).order_by('-created_at')

        # Apply cursor pagination
        paginator = MessageCursorPagination()
        page = paginator.paginate_queryset(queryset, request)

        if page is not None:
            serializer = MessageSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        serializer = MessageSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='add-participant')
    def add_participant(self, request, pk=None):
        """Add a user to a group conversation."""
        conversation = self.get_object()

        # Check if user is admin
        try:
            participant = ConversationParticipant.objects.get(
                conversation=conversation,
                user=request.user
            )
            if participant.role != 'admin':
                return Response(
                    {'error': _('You do not have permission to add participants')},
                    status=status.HTTP_403_FORBIDDEN
                )
        except ConversationParticipant.DoesNotExist:
            return Response(
                {'error': _('You are not a participant in this conversation')},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': _('User not found')},
                status=status.HTTP_404_NOT_FOUND
            )

        conversation.add_participant(user, role='member')

        serializer = ParticipantSerializer(
            ConversationParticipant.objects.get(conversation=conversation, user=user)
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave a conversation."""
        conversation = self.get_object()

        try:
            participant = ConversationParticipant.objects.get(
                conversation=conversation,
                user=request.user
            )
            participant.delete()

            # If no more participants, deactivate conversation
            if conversation.participants.count() == 0:
                conversation.is_active = False
                conversation.save()

            return Response(status=status.HTTP_204_NO_CONTENT)

        except ConversationParticipant.DoesNotExist:
            return Response(
                {'error': _('You are not a participant in this conversation')},
                status=status.HTTP_403_FORBIDDEN
            )

    @action(detail=True, methods=['post'])
    def mute(self, request, pk=None):
        """Toggle mute for a conversation."""
        conversation = self.get_object()

        try:
            participant = ConversationParticipant.objects.get(
                conversation=conversation,
                user=request.user
            )
            participant.is_muted = not participant.is_muted
            participant.save()

            serializer = ParticipantSerializer(participant)
            return Response(serializer.data)

        except ConversationParticipant.DoesNotExist:
            return Response(
                {'error': _('You are not a participant in this conversation')},
                status=status.HTTP_403_FORBIDDEN
            )

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Mark all messages in conversation as read."""
        conversation = self.get_object()

        try:
            participant = ConversationParticipant.objects.get(
                conversation=conversation,
                user=request.user
            )
            participant.mark_as_read()

            # Mark messages as read
            conversation.messages.filter(is_deleted=False).update(is_read=True)

            return Response({'status': 'Messages marked as read'})

        except ConversationParticipant.DoesNotExist:
            return Response(
                {'error': _('You are not a participant in this conversation')},
                status=status.HTTP_403_FORBIDDEN
            )


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get messages filtered by conversation."""
        conversation_id = self.request.query_params.get('conversation_id')
        queryset = Message.objects.filter(is_deleted=False)

        if conversation_id:
            queryset = queryset.filter(conversation_id=conversation_id)

        return queryset.select_related('sender', 'conversation').order_by('-created_at')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MessageCreateSerializer
        return MessageSerializer

    def list(self, request, *args, **kwargs):
        """List messages for a conversation."""
        conversation_id = request.query_params.get('conversation_id')

        if not conversation_id:
            return Response(
                {'error': _('conversation_id query parameter is required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user is a participant
        try:
            ConversationParticipant.objects.get(
                conversation_id=conversation_id,
                user=request.user
            )
        except ConversationParticipant.DoesNotExist:
            return Response(
                {'error': _('You are not a participant in this conversation')},
                status=status.HTTP_403_FORBIDDEN
            )

        queryset = self.get_queryset()

        # Apply cursor pagination
        paginator = MessageCursorPagination()
        page = paginator.paginate_queryset(queryset, request)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Send a message via REST API."""
        conversation_id = request.data.get('conversation_id')

        if not conversation_id:
            return Response(
                {'error': _('conversation_id is required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response(
                {'error': _('Conversation not found')},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is a participant
        try:
            ConversationParticipant.objects.get(
                conversation=conversation,
                user=request.user
            )
        except ConversationParticipant.DoesNotExist:
            return Response(
                {'error': _('You are not a participant in this conversation')},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            **serializer.validated_data
        )

        return Response(
            MessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    def destroy(self, request, *args, **kwargs):
        """Soft delete a message (sender or admin only)."""
        message = self.get_object()

        # Check if user is the sender or admin
        if message.sender != request.user:
            try:
                participant = ConversationParticipant.objects.get(
                    conversation=message.conversation,
                    user=request.user
                )
                if participant.role != 'admin':
                    return Response(
                        {'error': _('You can only delete your own messages')},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except ConversationParticipant.DoesNotExist:
                return Response(
                    {'error': _('You are not a participant in this conversation')},
                    status=status.HTTP_403_FORBIDDEN
                )

        message.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search messages in a conversation."""
        query = request.query_params.get('q', '')
        conversation_id = request.query_params.get('conversation_id')

        if not query or not conversation_id:
            return Response(
                {'error': _('q and conversation_id parameters are required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user is a participant
        try:
            ConversationParticipant.objects.get(
                conversation_id=conversation_id,
                user=request.user
            )
        except ConversationParticipant.DoesNotExist:
            return Response(
                {'error': _('You are not a participant in this conversation')},
                status=status.HTTP_403_FORBIDDEN
            )

        queryset = Message.objects.filter(
            conversation_id=conversation_id,
            is_deleted=False,
            text__icontains=query
        ).order_by('-created_at')

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
