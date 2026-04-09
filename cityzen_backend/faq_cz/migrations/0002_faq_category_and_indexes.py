from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("faq_cz", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="faq",
            name="category",
            field=models.CharField(
                choices=[
                    ("general", "General"),
                    ("account", "Account"),
                    ("reporting", "Reporting"),
                    ("community", "Community"),
                    ("technical", "Technical"),
                ],
                default="general",
                max_length=20,
            ),
        ),
        migrations.AddIndex(
            model_name="faq",
            index=models.Index(
                fields=["category", "is_active", "order"],
                name="faq_cz_faq_categor_2b08ea_idx",
            ),
        ),
    ]
