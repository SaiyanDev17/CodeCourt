// PROJECT_STATUS.md generator
// Parses tasks.md and generates a status report with API health map

const fs = require('fs');
const path = require('path');

function parsePhases(tasksContent) {
  const lines = tasksContent.split('\n');
  const phases = [];
  let currentPhase = null;
  let phaseCount = 0;
  let taskCount = 0;

  lines.forEach((line, index) => {
    // Trim the line to remove trailing spaces
    const trimmedLine = line.trimEnd();
    
    // Match phase headers like "## PHASE 0: Prerequisites & Setup (Week 0 - All Members)"
    const phaseMatch = trimmedLine.match(/^##\s+PHASE\s+(\d+):\s+(.+?)(?:\s+\(Week.+?\))?$/);
    if (phaseMatch) {
      phaseCount++;
      if (currentPhase) {
        phases.push(currentPhase);
      }
      currentPhase = {
        number: parseInt(phaseMatch[1]),
        name: phaseMatch[2].trim(),
        total: 0,
        completed: 0,
        inProgress: 0,
        notStarted: 0
      };
    }

    // Count tasks
    if (currentPhase) {
      if (trimmedLine.match(/^-\s+\[x\]/)) {
        currentPhase.completed++;
        currentPhase.total++;
        taskCount++;
      } else if (trimmedLine.match(/^-\s+\[-\]/)) {
        currentPhase.inProgress++;
        currentPhase.total++;
        taskCount++;
      } else if (trimmedLine.match(/^-\s+\[\s\]/)) {
        currentPhase.notStarted++;
        currentPhase.total++;
        taskCount++;
      } else if (trimmedLine.match(/^-\s+\[~\]/)) {
        // Queued tasks count as not started
        currentPhase.notStarted++;
        currentPhase.total++;
        taskCount++;
      }
    }
  });

  if (currentPhase) {
    phases.push(currentPhase);
  }

  console.log(`  Phases found: ${phaseCount}`);
  console.log(`  Tasks found: ${taskCount}`);

  return phases;
}

function getPhaseStatus(phase) {
  if (phase.completed === phase.total) {
    return '✅ Complete';
  } else if (phase.inProgress > 0 || phase.completed > 0) {
    return '🔄 In Progress';
  } else {
    return '⏸️ Not Started';
  }
}

function scanAPIRoutes() {
  const routesDir = path.join(__dirname, '../backend/src/modules');
  const modules = [];

  try {
    const moduleDirs = fs.readdirSync(routesDir);
    
    moduleDirs.forEach(moduleName => {
      const routesPath = path.join(routesDir, moduleName, 'routes.js');
      if (fs.existsSync(routesPath)) {
        const routesContent = fs.readFileSync(routesPath, 'utf-8');
        const endpoints = [];

        // Extract route definitions
        const routeMatches = routesContent.matchAll(/router\.(get|post|put|delete|patch)\(['"](.+?)['"]/g);
        for (const match of routeMatches) {
          endpoints.push({
            method: match[1].toUpperCase(),
            path: `/api/${moduleName}${match[2]}`
          });
        }

        if (endpoints.length > 0) {
          modules.push({
            name: moduleName,
            endpoints: endpoints.length,
            routes: endpoints
          });
        }
      }
    });
  } catch (error) {
    console.warn('⚠️ Could not scan API routes:', error.message);
  }

  return modules;
}

function generateStatus() {
  try {
    const tasksPath = path.join(__dirname, '../.kiro/specs/codecourt-mvp/tasks.md');
    
    if (!fs.existsSync(tasksPath)) {
      console.error('✗ tasks.md not found at:', tasksPath);
      process.exit(1);
    }
    
    const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
    console.log(`  File size: ${tasksContent.length} bytes`);
    console.log(`  Lines: ${tasksContent.split('\n').length}`);

    // Parse phases
    const phases = parsePhases(tasksContent);
    
    // Calculate overall stats
    const totalTasks = phases.reduce((sum, p) => sum + p.total, 0);
    const completedTasks = phases.reduce((sum, p) => sum + p.completed, 0);
    const inProgressTasks = phases.reduce((sum, p) => sum + p.inProgress, 0);
    const completionPercentage = totalTasks > 0 
      ? ((completedTasks / totalTasks) * 100).toFixed(1)
      : 0;

    // Scan API routes
    const apiModules = scanAPIRoutes();

    // Generate PROJECT_STATUS.md
    let statusContent = `# CodeCourt MVP - Project Status

**Last Updated:** ${new Date().toISOString().split('T')[0]}
**Generated:** ${new Date().toLocaleString()}

## 📊 Overall Progress

\`\`\`
Progress: [${'█'.repeat(Math.floor(completionPercentage / 2))}${' '.repeat(50 - Math.floor(completionPercentage / 2))}] ${completionPercentage}%
\`\`\`

- **Total Tasks:** ${totalTasks}
- **Completed:** ${completedTasks} ✅
- **In Progress:** ${inProgressTasks} 🔄
- **Not Started:** ${totalTasks - completedTasks - inProgressTasks} ⏸️

## 📋 Phase Status

`;

    phases.forEach(phase => {
      const status = getPhaseStatus(phase);
      const phasePercentage = phase.total > 0 
        ? ((phase.completed / phase.total) * 100).toFixed(0)
        : 0;
      
      statusContent += `### Phase ${phase.number}: ${phase.name}
${status} — ${phase.completed}/${phase.total} tasks (${phasePercentage}%)

`;
    });

    // Add API Health Map
    if (apiModules.length > 0) {
      statusContent += `## 🔌 API Health Map

`;
      apiModules.forEach(module => {
        statusContent += `### ${module.name.charAt(0).toUpperCase() + module.name.slice(1)} Module
**Endpoints:** ${module.endpoints}

`;
        module.routes.forEach(route => {
          statusContent += `- \`${route.method}\` ${route.path}\n`;
        });
        statusContent += '\n';
      });
    }

    statusContent += `---

*This file is auto-generated by \`scripts/generate-status.js\`*
*Run \`node scripts/generate-status.js\` to update*
`;

    const outputPath = path.join(__dirname, '../PROJECT_STATUS.md');
    fs.writeFileSync(outputPath, statusContent);
    console.log('✓ PROJECT_STATUS.md generated successfully');
    console.log(`  Total tasks: ${totalTasks}`);
    console.log(`  Completed: ${completedTasks} (${completionPercentage}%)`);
    console.log(`  API modules: ${apiModules.length}`);

  } catch (error) {
    console.error('✗ Error generating status:', error);
    process.exit(1);
  }
}

generateStatus();
