# Rose onboarding and demo preview

This is the standalone Rose purchase page and website style preview. The left side
mounts the real Rose widget beside an animated visitor. Speech bubbles rotate
through four illustrative conversations and example tool handoffs. The hero
widget can be used directly; interacting with it pauses the animation. Plan
selection and secure checkout sit beside the scene on desktop and come first on
mobile. The larger interactive Rose preview follows below. Custom tool
integrations are scoped separately during setup.

Run `python3 site_preview_server.py` from this folder, then open
<http://127.0.0.1:8799/>. On a Mac, `start-preview.command` does both.
The local server supplies the website style and screenshot preview endpoints.

The checkout form sends the buyer's setup details to the existing Rose checkout
API and then opens its Square payment link. It does not take card details on this
page. Do not submit the form with test customer details: submitting creates a real
checkout lead and sends notifications. The static HTML can be opened on its own,
but website style and screenshot previews require the local server.
