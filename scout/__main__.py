"""
Entry point for running the scout module with `python -m scout`.
"""

if __name__ == "__main__":
    from scout.client import main
    import asyncio
    
    # only needed if running in an ipykernel
    try:
        import nest_asyncio
        nest_asyncio.apply()
    except ImportError:
        pass
    
    asyncio.run(main())
