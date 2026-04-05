from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("report_cz", "0002_report_category"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReportImage",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("image", models.ImageField(upload_to="report_images/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "report",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="images",
                        to="report_cz.report",
                    ),
                ),
            ],
            options={"ordering": ["created_at"]},
        ),
    ]
