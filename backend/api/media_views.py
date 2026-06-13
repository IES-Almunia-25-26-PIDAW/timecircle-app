"""Views for serving media files securely."""
from django.conf import settings
from django.http import FileResponse, JsonResponse, HttpResponseRedirect
from django.views.decorators.http import condition
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
import os
import mimetypes


@api_view(['GET'])
@permission_classes([AllowAny])
def serve_media(request, path):
    """
    Serve media files securely.
    In production: redirects to signed S3 URLs.
    In development: serves files locally.
    """
    if not path:
        return JsonResponse({'error': 'No path provided'}, status=400)
    
    if settings.DEBUG:
        # Development: serve local files
        file_path = os.path.join(settings.MEDIA_ROOT, path)
        
        # Security: prevent directory traversal
        if not os.path.abspath(file_path).startswith(os.path.abspath(settings.MEDIA_ROOT)):
            return JsonResponse({'error': 'Invalid path'}, status=403)
        
        if not os.path.exists(file_path):
            return JsonResponse({'error': 'File not found'}, status=404)
        
        return FileResponse(open(file_path, 'rb'), content_type=mimetypes.guess_type(file_path)[0])
    
    else:
        # Production: redirect to S3 with signed URL
        from storages.backends.s3boto3 import S3Boto3Storage
        storage = S3Boto3Storage()
        
        # Generate signed URL (valid for 1 hour)
        try:
            url = storage.url(path)
            return HttpResponseRedirect(url)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
