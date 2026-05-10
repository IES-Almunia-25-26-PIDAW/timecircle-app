from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_user_city_user_country_user_latitude_user_longitude_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='street_address',
            field=models.CharField(blank=True, default='', max_length=250),
        ),
        migrations.AddField(
            model_name='user',
            name='postal_code',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
        migrations.AddField(
            model_name='user',
            name='share_exact_location',
            field=models.BooleanField(default=False),
        ),
    ]
