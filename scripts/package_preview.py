"""Package the self-contained public page so it can be downloaded as an archive."""
from pathlib import Path
import zipfile

ROOT=Path(__file__).resolve().parents[1]


def package():
    source=ROOT/'frontend/gradpath.html'
    output=ROOT/'downloads/Gradpath-Preview.zip'
    output.parent.mkdir(exist_ok=True)
    instructions=(
        'Gradpath 网页预览\n\n'
        '1. 下载并解压此压缩包。\n'
        '2. 用 Chrome / Edge 浏览器打开 Gradpath.html。\n\n'
        '学校目录、地图、申请清单和文书编辑都已内嵌，无需安装程序。\n'
        '文书和申请记录保存在当前浏览器；需要时可导出文稿。\n'
        'GPT 对话需要配套服务和 API 密钥，下载版可以先查看界面和其他交互。\n'
    )
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('Gradpath.html',source.read_bytes())
        archive.writestr('README.txt',instructions)
    print('Packaged standalone public HTML and opening instructions:',output)


if __name__=='__main__':package()
