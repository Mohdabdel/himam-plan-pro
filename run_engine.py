import sys, json, os
sys.path.insert(0, 'engine')
if len(sys.argv) < 2:
    print("الاستخدام: python run_engine.py data/himam_profile_example.json")
    sys.exit(1)
with open(sys.argv[1], encoding='utf-8') as f:
    profile = json.load(f)
from silent_engine import SilentEngine
engine = SilentEngine()
result = engine.run(profile)
os.makedirs('outputs', exist_ok=True)
out = f"outputs/calibrated_{os.path.basename(sys.argv[1])}"
with open(out, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print(f"✅ تم: {out}")
