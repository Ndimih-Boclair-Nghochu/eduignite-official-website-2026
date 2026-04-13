from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate
from drf_spectacular.utils import extend_schema
import logging

from .serializers import (
    LoginSerializer,
    TokenResponseSerializer,
    FirebaseLoginSerializer,
    ActivateAccountSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from .firebase_backend import FirebaseAuthentication

User = get_user_model()
logger = logging.getLogger(__name__)


class MatriculeLoginView(APIView):
    """
    POST /auth/login/
    Login with matricule and password.
    Returns access token, refresh token, and user profile.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: TokenResponseSerializer,
            400: {'type': 'object', 'properties': {'detail': {'type': 'string'}}},
        },
        tags=['Authentication'],
        description='Login with matricule and password',
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        matricule = serializer.validated_data['matricule']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(matricule=matricule)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {'detail': 'User account is inactive'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.check_password(password):
            return Response(
                {'detail': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        user.last_login = __import__('django.utils.timezone', fromlist=['now']).now()
        user.save(update_fields=['last_login'])

        response_data = {
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'user': {
                'id': str(user.id),
                'matricule': user.matricule,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'avatar': user.avatar.url if user.avatar else None,
            },
        }

        return Response(response_data, status=status.HTTP_200_OK)


class FirebaseLoginView(APIView):
    """
    POST /auth/firebase-login/
    Login with Firebase ID token.
    Returns access token, refresh token, and user profile.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        request=FirebaseLoginSerializer,
        responses={
            200: TokenResponseSerializer,
            400: {'type': 'object', 'properties': {'detail': {'type': 'string'}}},
        },
        tags=['Authentication'],
        description='Login with Firebase ID token',
    )
    def post(self, request):
        serializer = FirebaseLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        id_token = serializer.validated_data['id_token']

        firebase_auth = FirebaseAuthentication()
        try:
            from firebase_admin import auth as fb_auth
            decoded_token = fb_auth.verify_id_token(id_token)
        except Exception as e:
            logger.warning(f'Firebase token verification failed: {str(e)}')
            return Response(
                {'detail': 'Invalid Firebase token'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        uid = decoded_token.get('uid')
        try:
            user = User.objects.get(uid=uid)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user.is_active:
            return Response(
                {'detail': 'User account is inactive'},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        user.last_login = __import__('django.utils.timezone', fromlist=['now']).now()
        user.save(update_fields=['last_login'])

        response_data = {
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'user': {
                'id': str(user.id),
                'matricule': user.matricule,
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'avatar': user.avatar.url if user.avatar else None,
            },
        }

        return Response(response_data, status=status.HTTP_200_OK)


class RefreshTokenView(APIView):
    """
    POST /auth/refresh/
    Refresh access token using refresh token.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        request={'type': 'object', 'properties': {'refresh': {'type': 'string'}}},
        responses={
            200: {'type': 'object', 'properties': {'access': {'type': 'string'}}},
        },
        tags=['Authentication'],
        description='Refresh access token',
    )
    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            refresh = RefreshToken(refresh_token)
            return Response({'access': str(refresh.access_token)}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'detail': 'Invalid refresh token'},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class LogoutView(APIView):
    """
    POST /auth/logout/
    Logout by blacklisting refresh token.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request={'type': 'object', 'properties': {'refresh': {'type': 'string'}}},
        responses={
            200: {'type': 'object', 'properties': {'detail': {'type': 'string'}}},
        },
        tags=['Authentication'],
        description='Logout and blacklist refresh token',
    )
    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'detail': 'Refresh token required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            refresh = RefreshToken(refresh_token)
            refresh.blacklist()
            return Response({'detail': 'Logged out successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'detail': 'Invalid refresh token'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ActivateAccountView(APIView):
    """
    POST /auth/activate/
    First-time account activation and password setting.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        request=ActivateAccountSerializer,
        responses={200: {'type': 'object', 'properties': {'detail': {'type': 'string'}}}},
        tags=['Authentication'],
        description='Activate account and set password',
    )
    def post(self, request):
        serializer = ActivateAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        matricule = serializer.validated_data['matricule']
        new_password = serializer.validated_data['new_password']

        try:
            user = User.objects.get(matricule=matricule)
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        user.set_password(new_password)
        user.save(update_fields=['password'])

        return Response(
            {'detail': 'Account activated successfully'},
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    """
    POST /auth/change-password/
    Change password for authenticated user.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ChangePasswordSerializer,
        responses={200: {'type': 'object', 'properties': {'detail': {'type': 'string'}}}},
        tags=['Authentication'],
        description='Change password for authenticated user',
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        new_password = serializer.validated_data['new_password']

        user.set_password(new_password)
        user.save(update_fields=['password'])

        return Response(
            {'detail': 'Password changed successfully'},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(APIView):
    """
    POST /auth/password-reset/
    Request password reset with email verification.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        request=PasswordResetRequestSerializer,
        responses={200: {'type': 'object', 'properties': {'detail': {'type': 'string'}}}},
        tags=['Authentication'],
        description='Request password reset',
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
            from rest_framework_simplejwt.tokens import RefreshToken
            from django.core.mail import send_mail
            from django.conf import settings as django_settings

            refresh = RefreshToken.for_user(user)
            reset_token = str(refresh.access_token)

            # Build the reset URL (frontend handles the /reset-password?token=... route)
            frontend_url = getattr(django_settings, 'FRONTEND_URL', 'https://eduignite.com')
            reset_url = f"{frontend_url}/reset-password?token={reset_token}"

            user_name = user.get_full_name() or user.email

            subject = "EduIgnite – Password Reset Request"
            plain_body = (
                f"Hello {user_name},\n\n"
                f"We received a request to reset your EduIgnite password.\n\n"
                f"Click the link below to set a new password (valid for 5 minutes):\n"
                f"{reset_url}\n\n"
                f"If you did not request this, you can safely ignore this email.\n\n"
                f"— The EduIgnite Team"
            )
            html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <tr><td style="background:#1a1a2e;padding:32px;text-align:center;">
      <h1 style="color:#f5c518;margin:0;font-size:28px;letter-spacing:2px;">EduIgnite</h1>
      <p style="color:#ffffff80;font-size:12px;margin:6px 0 0;">School Management Platform</p>
    </td></tr>
    <tr><td style="padding:40px 48px;">
      <h2 style="color:#1a1a2e;margin:0 0 16px;">Password Reset Request</h2>
      <p style="color:#555;line-height:1.6;">Hello <strong>{user_name}</strong>,</p>
      <p style="color:#555;line-height:1.6;">
        We received a request to reset the password for your EduIgnite account.
        Click the button below to set a new password. This link expires in <strong>5 minutes</strong>.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{reset_url}" style="background:#f5c518;color:#1a1a2e;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
          Reset My Password
        </a>
      </div>
      <p style="color:#999;font-size:13px;line-height:1.6;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="{reset_url}" style="color:#1a1a2e;word-break:break-all;">{reset_url}</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0;">
      <p style="color:#bbb;font-size:12px;">
        If you did not request a password reset, you can safely ignore this email.
        Your password will remain unchanged.
      </p>
    </td></tr>
    <tr><td style="background:#f8f8f8;padding:20px;text-align:center;">
      <p style="color:#bbb;font-size:11px;margin:0;">© 2026 EduIgnite · Cameroon · eduignitecmr@gmail.com</p>
    </td></tr>
  </table>
</body>
</html>"""

            try:
                send_mail(
                    subject=subject,
                    message=plain_body,
                    from_email=django_settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    html_message=html_body,
                    fail_silently=False,
                )
                logger.info(f"Password reset email sent to {email}")
            except Exception as mail_err:
                logger.error(f"Failed to send password reset email to {email}: {mail_err}")

        except User.DoesNotExist:
            pass  # Don't leak whether the email exists

        # Always return the same response regardless of whether user exists
        return Response(
            {'detail': 'If an account with that email exists, a password reset link has been sent.'},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    """
    POST /auth/password-reset/confirm/
    Confirm password reset with token.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        request=PasswordResetConfirmSerializer,
        responses={200: {'type': 'object', 'properties': {'detail': {'type': 'string'}}}},
        tags=['Authentication'],
        description='Confirm password reset',
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            from rest_framework_simplejwt.tokens import AccessToken
            access = AccessToken(token)  # validates signature & expiry
            user_id = access.get('user_id')
            user = User.objects.get(id=user_id)

            user.set_password(new_password)
            user.save(update_fields=['password'])

            return Response(
                {'detail': 'Password reset successfully'},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.warning(f'Password reset token validation failed: {str(e)}')
            return Response(
                {'detail': 'Invalid or expired reset token'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MeView(APIView):
    """
    GET /auth/me/
    Return current authenticated user's full profile.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'id': {'type': 'string'},
                    'matricule': {'type': 'string'},
                    'name': {'type': 'string'},
                    'email': {'type': 'string'},
                    'phone': {'type': 'string'},
                    'whatsapp': {'type': 'string'},
                    'role': {'type': 'string'},
                    'school': {'type': 'object'},
                    'avatar': {'type': 'string'},
                    'is_license_paid': {'type': 'boolean'},
                    'ai_request_count': {'type': 'integer'},
                    'is_active': {'type': 'boolean'},
                    'date_joined': {'type': 'string'},
                },
            },
        },
        tags=['Authentication'],
        description='Get current user profile',
    )
    def get(self, request):
        user = request.user
        school_data = None
        if user.school:
            school_data = {
                'id': user.school.id,
                'name': user.school.name,
                'short_name': user.school.short_name,
                'location': user.school.location,
            }

        return Response(
            {
                'id': str(user.id),
                'matricule': user.matricule,
                'name': user.name,
                'email': user.email,
                'phone': user.phone or '',
                'whatsapp': user.whatsapp or '',
                'role': user.role,
                'school': school_data,
                'avatar': user.avatar.url if user.avatar else None,
                'is_license_paid': user.is_license_paid,
                'ai_request_count': user.ai_request_count,
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat(),
            },
            status=status.HTTP_200_OK,
        )
