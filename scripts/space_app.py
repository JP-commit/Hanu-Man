import os
import runpy

os.chdir(os.path.dirname(os.path.abspath(__file__)))
os.system("bash install.sh")

runpy.run_path("app/app_v2.py", run_name="__main__")
