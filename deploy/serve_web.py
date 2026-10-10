from pathlib import Path

from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

from main import app


class SpaStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 404:
            response = FileResponse(self.directory / Path("index.html"))
        if response.headers.get("content-type", "").startswith("text/html"):
            response.headers["Cache-Control"] = "no-store"
        return response


frontend = Path(__file__).resolve().parent.parent / "frontend" / "dist"
app.mount("/", SpaStaticFiles(directory=frontend, html=True), name="frontend")
