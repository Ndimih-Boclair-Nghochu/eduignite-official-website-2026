from rest_framework import serializers
from .models import Testimony, CommunityBlog, BlogComment


class TestimonySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Testimony
        fields = ['id', 'user', 'user_name', 'user_avatar', 'school_name', 'role_display',
                  'message', 'status', 'created_at']

    def get_user_avatar(self, obj):
        if obj.user.avatar:
            return obj.user.avatar.url
        return None


class TestimonyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimony
        fields = ['school_name', 'role_display', 'message']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BlogCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_avatar = serializers.SerializerMethodField()

    class Meta:
        model = BlogComment
        fields = ['id', 'author', 'author_name', 'author_avatar', 'content', 'is_approved', 'created_at']

    def get_author_avatar(self, obj):
        if obj.author.avatar:
            return obj.author.avatar.url
        return None


class CommunityBlogListSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_role = serializers.CharField(source='author.role', read_only=True)
    author_avatar = serializers.SerializerMethodField()

    class Meta:
        model = CommunityBlog
        fields = ['id', 'title', 'author', 'author_name', 'author_role', 'author_avatar',
                  'image', 'slug', 'view_count', 'created_at', 'is_published']

    def get_author_avatar(self, obj):
        if obj.author.avatar:
            return obj.author.avatar.url
        return None


class CommunityBlogDetailSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_role = serializers.CharField(source='author.role', read_only=True)
    author_avatar = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()

    class Meta:
        model = CommunityBlog
        fields = ['id', 'title', 'author', 'author_name', 'author_role', 'author_avatar',
                  'image', 'paragraphs', 'slug', 'view_count', 'is_published', 'published_at',
                  'created_at', 'comments']

    def get_author_avatar(self, obj):
        if obj.author.avatar:
            return obj.author.avatar.url
        return None

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
