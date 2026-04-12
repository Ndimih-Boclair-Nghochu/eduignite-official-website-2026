# Merge migration resolving two parallel 0002 branches:
# - 0002_initial (FK fields & indexes)
# - 0002_student_qrcode_urlfield (qr_code ImageField → URLField)

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0002_initial'),
        ('students', '0002_student_qrcode_urlfield'),
    ]

    operations = [
    ]
