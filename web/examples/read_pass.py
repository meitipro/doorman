"""
Read a pass from Python with genlayer-py 0.19.0rc2, the way a bot written in Python would.

    python web/examples/read_pass.py <gate id> <wallet address>

Reads need an account even for views, so a throwaway one is made and never funded.
"""
import json
import sys

from genlayer_py import create_account, create_client
from genlayer_py.chains import studio_devnet

CONTRACT = json.load(open("web/lib/deployment.json"))["doorman"]
studio_devnet.rpc_urls = {"default": {"http": ["https://studio-next.genlayer.com/api"]}}

gate, address = int(sys.argv[1]), sys.argv[2].lower()
client = create_client(chain=studio_devnet, account=create_account())
pass_ = json.loads(client.read_contract(address=CONTRACT, function_name="get_pass", args=[gate, address]))
print(json.dumps({k: pass_[k] for k in ("found", "passed", "passed_at", "discord_id", "attempts", "left")}))
