# Converts Student.qr_code from ImageField to URLField so the QR code can be
# stored as a base64 data URL instead of a locally saved file.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='student',
            name='qr_code',
            field=models.URLField(blank=True, max_length=5000, null=True),
        ),
    ]
