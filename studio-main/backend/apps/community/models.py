from django.db import models
from django.utils.text import slugify
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Testimony(TimeStampedModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='testimonies')
    school_name = models.CharField(max_length=255)
    role_display = models.CharField(max_length=100)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='approved_testimonies')
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.school_name}"


class CommunityBlog(TimeStampedModel):
    author = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='community_blogs')
    title = models.CharField(max_length=255)
    image = models.ImageField(upload_to='community/blogs/', null=True, blank=True)
    paragraphs = models.JSONField(default=list)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    view_count = models.IntegerField(default=0)
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ['-published_at', '-created_at']
        indexes = [
            models.Index(fields=['is_published', 'published_at']),
            models.Index(fields=['slug']),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)


class BlogComment(TimeStampedModel):
    blog = models.ForeignKey(CommunityBlog, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey('users.User', on_delete=models.CASCADE)
    content = models.TextField()
    is_approved = models.BooleanField(default=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['blog', 'is_approved']),
        ]

    def __str__(self):
        return f"Comment on {self.blog.title} by {self.author.get_full_name()}"
