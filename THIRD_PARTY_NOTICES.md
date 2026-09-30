# Asset and library credits

## Anatomical brain

`assets/anatomical-brain.bin` is a subset of the anatomical atlas distributed by
[StarKnightt/brain-explorer](https://github.com/StarKnightt/brain-explorer).
It contains the unified cortex, cerebellum, and brain stem. Internal structures
and invisible picking proxies were omitted; geometry and normals were preserved.
The extraction script is `scripts/extract-brain-model.py`.

The source atlas derives from subject `sub-01` of OpenNeuro dataset ds006128,
“Data for ‘Modeling 2D Spatio-Tactile Population Receptive Fields of the Fingertip
in Human Primary Somatosensory Cortex’,” snapshot 1.0.11.

- Source dataset: https://github.com/OpenNeuroDatasets/ds006128
- DOI: https://doi.org/10.18112/openneuro.ds006128.v1.0.11
- Dataset license: CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/
- Atlas notices: https://github.com/StarKnightt/brain-explorer/blob/master/THIRD_PARTY_NOTICES.md
- Full source provenance: `assets/brain-atlas.provenance.json`
- Source GLB checksum: `assets/anatomical-brain.json`

The atlas pipeline reconstructs the cerebellum and brain stem as envelopes.
Workflow dots are illustrative software tool locations, not anatomical labels.
No application code from brain-explorer is included.

## Three.js

Three.js 0.160.1 is bundled locally in `vendor/three.module.min.js` under the
MIT license. The full copyright and license notice is `vendor/THREE-LICENSE.txt`.
