from django.apps import AppConfig
from corsheaders.signals import check_request_enabled

def cors_allowed_to_everyone(sender, request, **kwargs):
    path = request.path
    if path.startswith('/api/materials/task/') and path.endswith('/add_file/'):
        return True

class MaterialsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "materials"


    def ready(self):
        check_request_enabled.connect(cors_allowed_to_everyone)
