import re

with open('frontend/src/App.jsx', 'r') as f:
    content = f.read()

# Add import for LoginForm
content = content.replace(
    import { useEffect, useMemo, useRef, useState } from react
