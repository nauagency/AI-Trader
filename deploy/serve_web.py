from pathlib import Path

from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

from main import app


class SpaStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 404:
            return FileResponse(self.directory / Path("index.html"))
        return response


frontend = Path(__file__).resolve().parent.parent / "frontend" / "dist"
app.mount("/", SpaStaticFiles(directory=frontend, html=True), name="frontend")
