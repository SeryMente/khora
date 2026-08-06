import fs from 'fs';
import path from 'path';

function loadMatrix(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`Error loading matrix: ${e.message}`);
        process.exit(1);
    }
}

function checkProhibited(matrix) {
    const prohibited = matrix.prohibidos || [];
    let hasViolation = false;

    for (const wave of matrix.olas) {
        for (const task of wave.tareas) {
            for (const file of task.archivos) {
                const fullPath = file.startsWith('kernel/') || file.startsWith('docs/') || file.startsWith('scripts/') || file === '.gitignore' ? file : `khora-web/${file}`;

                if (prohibited.includes(fullPath)) {
                    console.error(`Violation: Task ${task.id} includes prohibited file ${file}`);
                    hasViolation = true;
                }
            }
        }
    }
    return !hasViolation;
}

function checkIntersections(matrix) {
    let hasViolation = false;

    for (const wave of matrix.olas) {
        const fileToTask = {};
        for (const task of wave.tareas) {
            for (const file of task.archivos) {
                if (fileToTask[file]) {
                    console.error(`Violation: Intersection found in wave ${wave.ola}. File ${file} is in both ${fileToTask[file]} and ${task.id}`);
                    hasViolation = true;
                } else {
                    fileToTask[file] = task.id;
                }
            }
        }
    }
    return !hasViolation;
}

function checkLiteralPaths(matrix) {
    let hasViolation = false;

    for (const wave of matrix.olas) {
        for (const task of wave.tareas) {
            for (const file of task.archivos) {
                if (file.includes('*') && !file.endsWith('/**')) {
                    console.error(`Violation: Task ${task.id} uses non-literal path (wildcard not allowed except /** at the end): ${file}`);
                    hasViolation = true;
                }
            }
        }
    }
    return !hasViolation;
}

function checkDependencies(matrix) {
    let hasViolation = false;
    const taskWave = {};

    for (const wave of matrix.olas) {
        for (const task of wave.tareas) {
            taskWave[task.id] = wave.ola;
        }
    }

    const dependencies = matrix.dependencias || {};
    for (const consumer in dependencies) {
        if (consumer === 'todas') continue; // special case

        const providers = dependencies[consumer];
        for (const provider of providers) {
            if (taskWave[consumer] === undefined) {
               continue; // Could be a global dep not in tasks
            }
            if (taskWave[provider] === undefined) {
               continue;
            }

            if (taskWave[consumer] <= taskWave[provider]) {
                console.error(`Violation: Dependency cycle/order error. Task ${consumer} (wave ${taskWave[consumer]}) depends on ${provider} (wave ${taskWave[provider]})`);
                hasViolation = true;
            }
        }
    }

    // Cycle check via DFS
    const graph = {};
    for (const consumer in dependencies) {
         if (consumer === 'todas') continue;
         if (!graph[consumer]) graph[consumer] = [];

         const providers = dependencies[consumer];
         for(const provider of providers){
              if (!graph[consumer].includes(provider)) {
                 graph[consumer].push(provider);
              }
         }
    }

    const visited = {};
    const recStack = {};

    function isCyclicUtil(v) {
        if (!visited[v]) {
            visited[v] = true;
            recStack[v] = true;

            const adj = graph[v] || [];
            for (let i = 0; i < adj.length; ++i) {
                if (!visited[adj[i]] && isCyclicUtil(adj[i])) {
                    return true;
                } else if (recStack[adj[i]]) {
                    return true;
                }
            }
        }
        recStack[v] = false;
        return false;
    }

    for (const node in graph) {
        if (isCyclicUtil(node)) {
            console.error(`Violation: Cycle detected in dependencies starting or involving ${node}`);
            hasViolation = true;
            break;
        }
    }


    return !hasViolation;
}

function main() {
    const matrixFile = 'docs/jules-matrix.v0.8.json';
    if (!fs.existsSync(matrixFile)) {
        console.error(`Matrix file ${matrixFile} not found.`);
        process.exit(1);
    }

    const matrix = loadMatrix(matrixFile);

    const v1 = checkProhibited(matrix);
    const v2 = checkIntersections(matrix);
    const v3 = checkLiteralPaths(matrix);
    const v4 = checkDependencies(matrix);

    if (v1 && v2 && v3 && v4) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

main();
