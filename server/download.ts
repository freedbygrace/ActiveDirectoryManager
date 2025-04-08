import { Express, Request, Response } from "express";
import archiver from "archiver";
import path from "path";
import fs from "fs";
import debugLib from "debug";
import { isAuthenticated } from "./authorization";

const debug = debugLib('api:download');

/**
 * Sets up download endpoints for the application
 * @param app Express application
 */
export function setupDownloadRoutes(app: Express) {
  // Endpoint to download the entire application as a zip file
  app.get('/api/download/app', isAuthenticated, (req: Request, res: Response) => {
    debug('Download application requested');
    
    const archive = archiver('zip', {
      zlib: { level: 9 } // Compression level
    });
    
    // Set appropriate headers
    res.attachment('ad-management-platform.zip');
    res.setHeader('Content-Type', 'application/zip');
    
    // Pipe archive data to the response
    archive.pipe(res);
    
    // Get the root directory (current working directory)
    const rootDir = process.cwd();
    
    // Add files and directories to include
    const includeFiles = [
      'client',
      'server', 
      'shared',
      'migrations',
      'package.json',
      'tsconfig.json',
      'tailwind.config.ts',
      'theme.json',
      'postcss.config.js',
      'vite.config.ts',
      'drizzle.config.ts',
      'Dockerfile',
      'README.md'
    ];
    
    // Exclude patterns (node_modules, .git, etc.)
    const excludePatterns = [
      '.git',
      'node_modules',
      'dist',
      '.cache',
      '.replit',
      '.env'
    ];
    
    // Helper function to check if path should be excluded
    const shouldExclude = (filePath: string): boolean => {
      return excludePatterns.some(pattern => filePath.includes(pattern));
    };
    
    // Add each included file/directory
    includeFiles.forEach(filePath => {
      const fullPath = path.join(rootDir, filePath);
      
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        
        if (stats.isFile() && !shouldExclude(fullPath)) {
          // Add individual file
          archive.file(fullPath, { name: filePath });
          debug(`Added file: ${filePath}`);
        } else if (stats.isDirectory()) {
          // Add directory recursively, with exclusions
          archive.glob('**/*', { 
            cwd: fullPath,
            ignore: excludePatterns,
            dot: true
          }, { prefix: filePath });
          debug(`Added directory: ${filePath}`);
        }
      } else {
        debug(`Path not found: ${fullPath}`);
      }
    });
    
    // Handle errors
    archive.on('error', (err) => {
      debug(`Error creating archive: ${err.message}`);
      res.status(500).send({ error: 'Failed to create download archive' });
    });
    
    // Finalize archive
    archive.finalize();
  });
}