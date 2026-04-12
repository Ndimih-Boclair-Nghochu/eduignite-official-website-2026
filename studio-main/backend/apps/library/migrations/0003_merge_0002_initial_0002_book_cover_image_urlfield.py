# Merge migration resolving two parallel 0002 branches:
# - 0002_initial (FK fields & indexes)
# - 0002_book_cover_image_urlfield (cover_image ImageField → URLField)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('library', '0002_initial'),
        ('library', '0002_book_cover_image_urlfield'),
    ]

    operations = [
    ]
