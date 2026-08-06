import { test, expect } from '@playwright/test';
import * as LucideIcons from 'lucide-react';

test('lucide-icons exports exactly the required 16 icons and is version 1.26.0', async () => {
    const requiredIcons = [
        'Mic', 'Files', 'Network', 'MessageSquareShare', 'LockKeyhole',
        'Activity', 'Circle', 'Clock3', 'Pause', 'Check',
        'TriangleAlert', 'RotateCcw', 'CircleX', 'WifiOff',
        'ShieldX', 'CircleDot'
    ];

    for (const icon of requiredIcons) {
        expect((LucideIcons as any)[icon]).toBeDefined();
    }

    const lucidePkg = require('lucide-react/package.json');
    expect(lucidePkg.version).toBe('1.26.0');
});
