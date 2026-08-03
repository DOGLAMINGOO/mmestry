from django.conf import settings
from django.core.files.storage import FileSystemStorage, Storage
from django.utils.deconstruct import deconstructible
from cloudinary_storage.storage import RawMediaCloudinaryStorage


@deconstructible
class DocumentStorage(Storage):
    """Storage for uploaded PDFs.

    Local development should not depend on Cloudinary accepting an uploaded
    document. In production, documents are uploaded as Cloudinary raw assets.
    """

    def _storage(self):
        if settings.DEBUG:
            return FileSystemStorage(location=settings.MEDIA_ROOT, base_url=settings.MEDIA_URL)
        return RawMediaCloudinaryStorage()

    def _open(self, name, mode='rb'):
        return self._storage()._open(name, mode)

    def _save(self, name, content):
        return self._storage()._save(name, content)

    def delete(self, name):
        return self._storage().delete(name)

    def exists(self, name):
        return self._storage().exists(name)

    def url(self, name):
        return self._storage().url(name)

    def size(self, name):
        return self._storage().size(name)

    def get_available_name(self, name, max_length=None):
        return self._storage().get_available_name(name, max_length)
