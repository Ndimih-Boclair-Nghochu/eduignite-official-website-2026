from rest_framework import serializers
from .models import Testimony, CommunityBlog, BlogComment


class AuthorSerializer(serializers.Serializer):
    """Minimal author representation embedded in blog/comment responses."""
    id = serializers.IntegerField(source='pk', read_only=True)
    name = serializers.SerializerMethodField()
    avatar = serializers.URLField(read_only=True)
    role = serializers.CharField(read_only=True)

    def get_name(self, obj):
        return obj.get_full_name() or obj.email


class TestimonySerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    content = serializers.CharField(source='message', read_only=True)

    class Meta:
        model = Testimony
        fields = ['id', 'author', 'school_name', 'role_display',
                  'message', 'content', 'status', 'created_at']

    def get_author(self, obj):
        return AuthorSerializer(obj.user).data


class TestimonyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimony
        fields = ['school_name', 'role_display', 'message']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BlogCommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = BlogComment
        fields = ['id', 'author', 'content', 'is_approved', 'created_at']

    def get_author(self, obj):
        return AuthorSerializer(obj.author).data


class CommunityBlogListSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = CommunityBlog
        fields = ['id', 'title', 'author', 'image', 'paragraphs', 'slug',
                  'view_count', 'created_at', 'is_published']

    def get_author(self, obj):
        return AuthorSerializer(obj.author).data


class CommunityBlogDetailSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()

    class Meta:
        model = CommunityBlog
        fields = ['id', 'title', 'author', 'image', 'paragraphs', 'slug',
                  'view_count', 'is_published', 'published_at', 'created_at', 'comments']

    def get_author(self, obj):
        return AuthorSerializer(obj.author).data

    def get_comments(self, obj):
        comments = obj.comments.filter(is_approved=True)
        return BlogCommentSerializer(comments, many=True).data


class CommunityBlogCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityBlog
        fields = ['title', 'image', 'paragraphs']

    def validate(self, data):
        if not isinstance(data.get('paragraphs', []), list):
            raise serializers.ValidationError("paragraphs must be a list of strings")
        return data

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)
