from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import Message, Conversation


@receiver(post_save, sender=Message)
def update_conversation_on_new_message(sender, instance, created, **kwargs):
    """Update conversation's last_message when a new message is created."""
    if created and not instance.is_deleted:
        instance.conversation.last_message = instance.text[:100]
        instance.conversation.last_message_at = timezone.now()
        instance.conversation.save(update_fields=['last_message', 'last_message_at'])


@receiver(post_save, sender=Message)
def handle_offline_notification(sender, instance, created, **kwargs):
    """Send offline notifications when message is created."""
    if created and not instance.is_deleted:
        from .tasks import send_offline_notification
        from users.models import User

        # Get conversation participants
        conversation = instance.conversation
        recipients = conversation.participants.exclude(id=instance.sender.id)

        for recipient in recipients:
            # Check if user is connected via WebSocket
            # For now, we'll queue the notification task to be sent
            # In production, you'd integrate with your WebSocket connection tracking
            send_offline_notification.delay(recipient.id, instance.id)
