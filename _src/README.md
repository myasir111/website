# Page sources

Tool pages and the Resources page are generated from these files:

- `toolsrc/<slug>.html` + `toolsrc/<slug>.js` - each calculator's body and script
- `tool_methods.py` - method, limits, verification and source keys per tool
- `resources_data.py` - every reference (single source for Resources and tool citations)

Rebuild from the repo root:

    python3 _src/build_tools.py _src/toolsrc tools
    python3 _src/build_resources.py resources.html
