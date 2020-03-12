import { expect } from 'chai';
import * as path from 'path';
import fs from 'fs-extra';
import Helper from '../../src/e2e-helper/e2e-helper';

describe('reduce-path functionality (eliminate the original shared-dir among component files and its dependencies)', function() {
  this.timeout(0);
  let helper: Helper;
  before(() => {
    helper = new Helper();
  });
  after(() => {
    helper.scopeHelper.destroy();
  });
  describe('with old-functionality (reduced on import) re-import after the author changed the originally-shared-dir', () => {
    let localConsumerFiles;
    before(() => {
      // Author creates a component in bar/foo.js
      helper.scopeHelper.setNewLocalAndRemoteScopes();
      helper.fixtures.createComponentBarFoo();
      helper.fixtures.addComponentBarFooLegacy();
      helper.command.tagAllComponents();
      helper.command.exportAllComponents();
      const authorScope = helper.scopeHelper.cloneLocalScope();
      helper.scopeHelper.reInitLocalScope();
      helper.scopeHelper.addRemoteScope();
      // Imported user gets the component without the "bar" directory as it is an originallySharedDir
      helper.command.importComponent('bar/foo');
      const barFooV2 = "module.exports = function foo() { return 'got foo v2'; };";
      expect(fs.existsSync(path.join(helper.scopes.localPath, 'components', 'bar', 'foo', 'foo.js'))).to.be.true;
      helper.fs.createFile(path.join('components', 'bar', 'foo'), 'foo.js', barFooV2); // update component
      helper.command.tagAllComponents();
      helper.command.exportAllComponents();
      const importedScope = helper.scopeHelper.cloneLocalScope();
      helper.scopeHelper.getClonedLocalScope(authorScope);
      helper.command.importComponent('bar/foo');
      // Authored user updates the component with the recent changes done by Imported user
      const authorLocation = path.join(helper.scopes.localPath, 'bar', 'foo.js');
      expect(fs.existsSync(authorLocation)).to.be.true;
      expect(fs.readFileSync(authorLocation).toString()).to.equal(barFooV2);
      helper.fs.createFile('', 'foo2.js');
      helper.command.addComponentLegacy('foo2.js', { i: 'bar/foo' });
      helper.command.tagAllComponents();
      helper.command.exportAllComponents();
      helper.scopeHelper.getClonedLocalScope(importedScope);
      // Imported user update the component with the recent changes done by Authored user
      helper.command.importComponent('bar/foo');
      localConsumerFiles = helper.fs.getConsumerFiles();
    });
    it('should save only the latest copy of the component and delete the old one', () => {
      expect(localConsumerFiles).to.include(path.join('components', 'bar', 'foo', 'bar', 'foo.js'));
      expect(localConsumerFiles).to.include(path.join('components', 'bar', 'foo', 'foo2.js'));
      // this makes sure that the older copy of the component is gone
      expect(localConsumerFiles).not.to.include(path.join('components', 'bar', 'foo', 'foo.js'));
    });
  });
  describe('with new functionality (save added path as rootDir, no reduce on import)', () => {
    describe('when rootDir is not the same as the sharedDir', () => {
      before(() => {
        helper.scopeHelper.setNewLocalAndRemoteScopes();
        helper.fs.outputFile('src/bar/foo.js');
        helper.command.addComponentDir('src', { i: 'comp' });
        helper.command.tagAllComponents();
        helper.command.exportAllComponents();
        helper.scopeHelper.reInitLocalScope();
        helper.scopeHelper.addRemoteScope();
        helper.command.importComponent('comp');
      });
      it('should not strip the shared dir', () => {
        const bitMap = helper.bitMap.read();
        const componentMap = bitMap[`${helper.scopes.remote}/comp@0.0.1`];
        expect(componentMap.rootDir).to.equal('components/comp');
        expect(componentMap.mainFile).to.equal('bar/foo.js');
      });
    });
  });
});
