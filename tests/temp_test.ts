
    import { mapPriority } from '../scripts/sync-todoist-notion.ts';
    console.log(JSON.stringify({
        p4: mapPriority(1),
        p3: mapPriority(2),
        p2: mapPriority(3),
        p1: mapPriority(4)
    }));
