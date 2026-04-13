"""
Celery tasks for automated share management and founder lifecycle enforcement.

Scheduled tasks:
  - expire_founder_shares         : daily - removes expired FounderShareAdjustment records
  - enforce_founder_renewal       : daily - deactivates / deletes founders whose renewable
                                    share period has ended without renewal
"""

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def expire_founder_shares(self):
    """
    Remove all FounderShareAdjustment records whose expires_at has passed.
    After removal the affected founder's additional_share_percentage automatically
    reflects the change (computed property filters out expired records).
    """
    from .models import FounderShareAdjustment

    now = timezone.now()
    expired_qs = FounderShareAdjustment.objects.filter(
        expires_at__isnull=False,
        expires_at__lte=now,
    )
    count = expired_qs.count()
    if count:
        logger.info('Removing %d expired share adjustment(s).', count)
        expired_qs.delete()
    else:
        logger.debug('No expired share adjustments found.')
    return f'Removed {count} expired share adjustment(s).'


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def enforce_founder_renewal(self):
    """
    Enforce renewal rules for founders with has_renewable_shares=True:

    Phase 1 – shares_expire_at has passed → deactivate the user account so
              they can no longer log in.  The founder is NOT yet deleted.

    Phase 2 – shares_expire_at + 30 days has passed without renewal
              → permanently delete the user (and cascade-delete the profile).
              The account is irrecoverable; they cannot log in again.
    """
    from .models import FounderProfile

    now = timezone.now()
    grace_cutoff = now - timedelta(days=30)

    # --- Phase 2: permanent deletion (expired > 30 days ago, still not renewed) ---
    to_delete = FounderProfile.objects.filter(
        has_renewable_shares=True,
        is_primary_founder=False,
        shares_expire_at__isnull=False,
        shares_expire_at__lte=grace_cutoff,
    )
    deleted_count = 0
    for profile in to_delete:
        name = profile.user.name
        matricule = profile.user.matricule
        logger.warning(
            'Deleting founder %s (%s): renewable shares expired on %s — '
            'grace period of 30 days elapsed without renewal.',
            name,
            matricule,
            profile.shares_expire_at,
        )
        profile.user.delete()  # CASCADE deletes the FounderProfile too
        deleted_count += 1

    # --- Phase 1: deactivate (expired but still within 30-day grace period) ---
    to_deactivate = FounderProfile.objects.filter(
        has_renewable_shares=True,
        is_primary_founder=False,
        shares_expire_at__isnull=False,
        shares_expire_at__lte=now,
        shares_expire_at__gt=grace_cutoff,
        user__is_active=True,
    )
    deactivated_count = 0
    for profile in to_deactivate:
        logger.info(
            'Deactivating founder %s (%s): renewable shares expired on %s — '
            '30-day grace period is running.',
            profile.user.name,
            profile.user.matricule,
            profile.shares_expire_at,
        )
        profile.user.is_active = False
        profile.user.save(update_fields=['is_active'])
        deactivated_count += 1

    return (
        f'enforce_founder_renewal: deleted={deleted_count}, '
        f'deactivated={deactivated_count}.'
    )
