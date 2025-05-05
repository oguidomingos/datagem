#!/usr/bin/env node
/**
 * Script para debugar caminhos e verificar os arquivos de definições
 */

import fs from 'fs';
import path from 'path';

function main() {
  const cwd = process.cwd();
  console.log(`Diretório de trabalho atual: ${cwd}`);
  
  const definitionsDir = path.join(cwd, 'apps', 'web', 'lib', 'airbyte-definitions');
  const sourcesFile = path.join(definitionsDir, 'sources.json');
  const destinationsFile = path.join(definitionsDir, 'destinations.json');
  
  console.log(`\nCaminhos esperados:`);
  console.log(`- Diretório de definições: ${definitionsDir}`);
  console.log(`- Arquivo de sources: ${sourcesFile}`);
  console.log(`- Arquivo de destinations: ${destinationsFile}`);
  
  console.log(`\nVerificando existência:`);
  console.log(`- Diretório de definições existe: ${fs.existsSync(definitionsDir)}`);
  console.log(`- Arquivo de sources existe: ${fs.existsSync(sourcesFile)}`);
  console.log(`- Arquivo de destinations existe: ${fs.existsSync(destinationsFile)}`);
  
  const relativeDefinitionsDir = path.join('lib', 'airbyte-definitions');
  const relativeSourcesFile = path.join(relativeDefinitionsDir, 'sources.json');
  const relativeDestinationsFile = path.join(relativeDefinitionsDir, 'destinations.json');
  
  console.log(`\nCaminhos relativos:`);
  console.log(`- Diretório de definições: ${relativeDefinitionsDir}`);
  console.log(`- Arquivo de sources: ${relativeSourcesFile}`);
  console.log(`- Arquivo de destinations: ${relativeDestinationsFile}`);
  
  console.log(`\nVerificando existência (caminhos relativos):`);
  console.log(`- Diretório de definições existe: ${fs.existsSync(relativeDefinitionsDir)}`);
  console.log(`- Arquivo de sources existe: ${fs.existsSync(relativeSourcesFile)}`);
  console.log(`- Arquivo de destinations existe: ${fs.existsSync(relativeDestinationsFile)}`);
  
  // Listar todos os arquivos no diretório de trabalho atual
  console.log(`\nArquivos no diretório atual:`);
  if (fs.existsSync(cwd)) {
    const files = fs.readdirSync(cwd);
    files.forEach(file => {
      console.log(`- ${file}`);
    });
  }
}

main();