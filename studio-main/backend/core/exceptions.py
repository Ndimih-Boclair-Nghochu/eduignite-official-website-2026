from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.exceptions import APIException
from rest_framework import status


class CustomAPIException(APIException):
    """Base custom API exception."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'An error occurred.'
    default_code = 'error'

    def __init__(self, detail=None, code=None, errors=None):
        super().__init__(detail)
        self.detail = detail or self.default_detail
        self.code = code or self.default_code
        self.errors = errors or {}


class PermissionDenied(CustomAPIException):
    """User does not have permission to perform this action."""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to perform this action.'
    default_code = 'permission_denied'


class NotFound(CustomAPIException):
    """The requested resource was not found."""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'The requested resource was not found.'
    default_code = 'not_found'


class ValidationError(CustomAPIException):
    """Input validation failed."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid input data.'
    default_code = 'validation_error'


class SchoolNotFound(NotFound):
    """School was not found."""

    default_detail = 'The specified school was not found.'
    default_code = 'school_not_found'


class UserNotFound(NotFound):
    """User was not found."""

    default_detail = 'The specified user was not found.'
    default_code = 'user_not_found'


class InvalidCredentials(CustomAPIException):
    """Authentication credentials are invalid."""

    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Invalid credentials.'
    default_code = 'invalid_credentials'


class UserAlreadyExists(CustomAPIException):
    """User already exists."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'User already exists.'
    default_code = 'user_already_exists'


class SchoolAlreadyExists(CustomAPIException):
    """School already exists."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'School already exists.'
    default_code = 'school_already_exists'


class InvalidRole(ValidationError):
    """The specified role is invalid."""

    default_detail = 'The specified role is invalid.'
    default_code = 'invalid_role'


class InsufficientPermissions(PermissionDenied):
    """User has insufficient permissions."""

    default_detail = 'Insufficient permissions for this operation.'
    default_code = 'insufficient_permissions'


class RateLimitExceeded(CustomAPIException):
    """Rate limit has been exceeded."""

    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'Rate limit exceeded. Please try again later.'
    default_code = 'rate_limit_exceeded'


class ServiceUnavailable(CustomAPIException):
    """External service is unavailable."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Service temporarily unavailable.'
    default_code = 'service_unavailable'


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns consistent JSON response format.
    """
    response = drf_exception_handler(exc, context)

    if response is None:
        return None

    error_data = {
        'status': False,
        'message': 'An error occurred.',
        'errors': {},
        'code': 'error',
    }

    if isinstance(exc, CustomAPIException):
        error_data['message'] = str(exc.detail)
        error_data['code'] = exc.code
        error_data['errors'] = exc.errors if hasattr(exc, 'errors') else {}
    elif hasattr(exc, 'detail'):
        if isinstance(exc.detail, dict):
            error_data['message'] = 'Validation error.'
            error_data['code'] = 'validation_error'
            error_data['errors'] = exc.detail
        elif isinstance(exc.detail, list):
            error_data['message'] = str(exc.detail[0]) if exc.detail else 'An error occurred.'
            error_data['code'] = getattr(exc, 'default_code', 'error')
        else:
            error_data['message'] = str(exc.detail)
            error_data['code'] = getattr(exc, 'default_code', 'error')

    response.data = error_data
    return response
