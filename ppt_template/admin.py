from django.contrib import admin
from .models import PPt_Template

# Register your models here.
class PPt_Template_Admin(admin.ModelAdmin):
    list_display = ('id', 'name', 'created_at')
    search_fields = ('name',)
    list_filter = ('created_at',)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['user'].initial = request.user
        return form
        
    # def save_model(self, request, obj, form, change):
    #     obj.user = request.user
    #     super().save_model(request, obj, form, change)

admin.site.register(PPt_Template, PPt_Template_Admin)
