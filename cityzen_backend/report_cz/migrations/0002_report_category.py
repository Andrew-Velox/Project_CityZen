from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("report_cz", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="report",
            name="category",
            field=models.CharField(
                choices=[
                    ("danger", "Danger"),
                    ("help", "Help"),
                    ("warning", "Warning"),
                    ("healthy", "Healthy"),
                ],
                default="warning",
                max_length=20,
            ),
        ),
    ]
