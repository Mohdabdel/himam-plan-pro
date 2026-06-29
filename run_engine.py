import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'engine')
import silent_engine

if len(sys.argv) < 2:
    print("الاستخدام: python run_engine.py data/himam_profile_example.json")
    sys.exit(1)

profile_path     = sys.argv[1]
concepts_db_path = sys.argv[2] if len(sys.argv) > 2 else "data/himam_concepts.json"
output_path      = f"outputs/calibrated_{os.path.basename(profile_path)}"

os.makedirs('outputs', exist_ok=True)

silent_engine.run(profile_path, concepts_db_path, output_path)
