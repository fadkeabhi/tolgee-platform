import 'cypress-file-upload';
import {
  assertMessage,
  confirmStandard,
  gcy,
  goToPage,
  selectInProjectMenu,
} from '../../common/shared';
import {
  enterProject,
  enterProjectSettings,
  visitList,
} from '../../common/projects';
import {
  createTranslation,
  getCellSaveButton,
} from '../../common/translations';
import { createTag, getAddTagButton } from '../../common/tags';
import { waitForGlobalLoading } from '../../common/loading';
import {
  assertAvailableCommands,
  move,
  selectFirst,
} from '../../common/shortcuts';
import { projectTestData } from '../../common/apiCalls/testData/testData';
import { login } from '../../common/apiCalls/common';

describe('Project Permissions', () => {
  beforeEach(() => {});

  afterEach(() => {
    waitForGlobalLoading();
  });

  describe("Cukrberg's permissions", () => {
    before(() => {
      projectTestData.clean();
      projectTestData.generate();
    });

    beforeEach(() => {
      login('cukrberg@facebook.com', 'admin');
    });

    it('Has edit permissions on microsoft word (organization base)', () => {
      validateEditPermissions('Microsoft Word', 'Microsoft');
    });

    it('Has manage permissions (direct manage permissions)', () => {
      validateManagePermissions(
        "Vaclav's funny project",
        'Vaclav organization'
      );
    });

    it('Has view permissions on facebook (direct view permissions)', () => {
      validateViewPermissions("Vaclav's cool project", 'Vaclav organization');
    });
  });

  describe("Vaclav's permissions", () => {
    before(() => {
      projectTestData.clean();
      projectTestData.generate();
    });

    beforeEach(() => {
      login('vaclav.novak@fake.com', 'admin');
    });

    it('Has edit permission on excel (direct) ', () => {
      validateEditPermissions('Microsoft Excel', 'Microsoft');
    });

    it('Has translate permission on Powerpoint (direct) ', () => {
      validateTranslatePermissions('Microsoft Powerpoint', 'Microsoft');
    });
  });

  describe('Permission settings', () => {
    describe('Not modifying', () => {
      before(() => {
        projectTestData.clean();
        projectTestData.generate();
      });

      beforeEach(() => {
        login('cukrberg@facebook.com', 'admin');
      });

      it('Can search in permissions', () => {
        visitList();
        enterProjectSettings('Facebook itself', 'Facebook');
        selectInProjectMenu('Members');
        gcy('global-list-search').find('input').type('Doe');
        gcy('global-paginated-list').within(() => {
          gcy('project-member-item')
            .should('have.length', 1)
            .should('contain', 'John Doe');
        });
      });

      it('Can paginate', () => {
        visitList();
        login('gates@microsoft.com', 'admin');
        enterProjectSettings('Microsoft Word', 'Microsoft');
        selectInProjectMenu('Members');
        goToPage(2);
        cy.contains('owner@zzzcool9.com (owner@zzzcool9.com)').should(
          'be.visible'
        );
      });

      it('Has enabled proper options for each user', () => {
        visitList();
        enterProjectSettings('Facebook itself', 'Facebook');
        selectInProjectMenu('Members');
        gcy('global-paginated-list').within(() => {
          gcy('project-member-item')
            .contains('John Doe')
            .closestDcy('project-member-item')
            .within(() => {
              gcy('project-member-revoke-button').should('be.disabled');
              gcy('permissions-menu-button').should('be.enabled');
            });
          gcy('project-member-item')
            .contains('Cukrberg')
            .closestDcy('project-member-item')
            .within(() => {
              gcy('project-member-revoke-button').should('be.disabled');
              gcy('permissions-menu-button').should('be.disabled');
            });
        });
      });
    });

    describe('Modifying', () => {
      beforeEach(() => {
        projectTestData.clean();
        projectTestData.generate();
        login('cukrberg@facebook.com', 'admin');
      });

      it('Can modify permissions', () => {
        visitList();
        enterProjectSettings('Facebook itself');
        selectInProjectMenu('Members');
        gcy('global-paginated-list').within(() => {
          gcy('project-member-item')
            .contains('Vaclav Novak')
            .closestDcy('project-member-item')
            .within(() => {
              gcy('permissions-menu-button')
                .should('be.visible')
                // clicks the button even if detached from dom
                .click({ force: true });
            });
        });
        gcy('permissions-menu').filter(':visible').contains('Manage').click();
        confirmStandard();
        login('vaclav.novak@fake.com', 'admin');
        visitList();
        validateManagePermissions('Facebook itself', 'Facebook');
      });

      it('Can revoke permissions', () => {
        visitList();
        enterProjectSettings('Facebook itself');
        selectInProjectMenu('Members');

        gcy('global-paginated-list').within(() => {
          gcy('project-member-item')
            .contains('Vaclav Novak')
            .closestDcy('project-member-item')
            .within(() => {
              gcy('project-member-revoke-button')
                .should('be.visible')
                // clicks the button even if detached from dom
                .click({ force: true });
            });
        });
        confirmStandard();
        login('vaclav.novak@fake.com', 'admin');
        visitList();
        cy.contains('Facebook itself').should('not.exist');
      });
    });
  });
});

const MANAGE_PROJECT_ITEMS = ['Members'];
const OTHER_PROJECT_ITEMS = ['Projects', 'Export'];

const assertManageMenuItemsNotVisible = () => {
  MANAGE_PROJECT_ITEMS.forEach((item) => {
    gcy('project-menu-items').get(`[aria-label="${item}"]`).should('not.exist');
  });
};

const assertLanguageSettingsNotOnDashboard = () => {
  gcy('project-dashboard-language-count').should('be.visible').click();
  cy.location('href').should('not.contain', '/languages');
  gcy('project-dashboard-language-menu').should('be.visible').click();
  gcy('project-dashboard-language-menu-export').should('be.visible');
  gcy('project-dashboard-language-menu-settings').should('not.exist');
  cy.get('body').click();
};

const assertLanguageSettingsOnDashboard = () => {
  gcy('project-dashboard-language-count').should('be.visible').click();
  cy.location('href').should('contain', '/languages');
  selectInProjectMenu('Project Dashboard');
  gcy('project-dashboard-language-menu').should('be.visible').click();
  gcy('project-dashboard-language-menu-settings').click();
  cy.location('href').should('contain', '/languages');
  selectInProjectMenu('Project Dashboard');
};

const assertUserSettingsNotOnDashboard = () => {
  gcy('project-dashboard-members').should('be.visible').click();
  cy.location('href').should('not.contain', '/permissions');
};

const assertUserSettingsOnDashboard = () => {
  gcy('project-dashboard-members').should('be.visible').click();
  cy.location('href').should('contain', '/permissions');
  selectInProjectMenu('Project Dashboard');
};

const assertOtherMenuItemsVisible = () => {
  OTHER_PROJECT_ITEMS.forEach((item) => {
    gcy('project-menu-items')
      .get(`[aria-label="${item}"]`)
      .should('be.visible');
  });
};

const validateManagePermissions = (
  projectName: string,
  organization: string
) => {
  visitList();
  enterProjectSettings(projectName, organization);
  cy.gcy('global-form-save-button').wait(100).click();
  assertMessage('Project settings successfully saved');
  selectInProjectMenu('Project Dashboard');
  assertLanguageSettingsOnDashboard();
  assertUserSettingsOnDashboard();
  enterProject(projectName, organization);
  MANAGE_PROJECT_ITEMS.forEach((item) => {
    gcy('project-menu-items')
      .get(`[aria-label="${item}"]`)
      .should('be.visible');
  });
  assertOtherMenuItemsVisible();
};

const validateEditPermissions = (projectName: string, organization: string) => {
  visitList();
  enterProject(projectName, organization);
  selectInProjectMenu('Project Dashboard');
  assertLanguageSettingsNotOnDashboard();
  assertUserSettingsNotOnDashboard();
  selectInProjectMenu('Translations');
  assertManageMenuItemsNotVisible();
  assertOtherMenuItemsVisible();
  selectFirst();
  assertAvailableCommands(['Move', 'Edit', 'Reviewed']);
  move('leftarrow');
  assertAvailableCommands(['Move', 'Edit']);
  createTranslation('cool_key');
  createTag('test_tag');
  cy.contains('test_tag').should('be.visible');
  gcy('translations-row-checkbox').first().click();
  gcy('translations-delete-button').click();
  confirmStandard();
  assertMessage('Translations deleted!');
};

const validateTranslatePermissions = (
  projectName: string,
  organization: string
) => {
  visitList();
  enterProject(projectName, organization);
  selectInProjectMenu('Project Dashboard');
  assertLanguageSettingsNotOnDashboard();
  assertUserSettingsNotOnDashboard();
  selectInProjectMenu('Translations');
  assertManageMenuItemsNotVisible();
  assertOtherMenuItemsVisible();
  selectFirst();
  assertAvailableCommands(['Move', 'Edit', 'Reviewed']);
  move('leftarrow');
  assertAvailableCommands(['Move']);
  getAddTagButton().should('not.exist');
  gcy('translations-add-button').should('not.exist');
  gcy('translations-row-checkbox').should('not.exist');
  cy.contains('This is test text!').click();
  getCellSaveButton().should('be.visible');
};

const validateViewPermissions = (projectName: string, organization: string) => {
  visitList();
  enterProject(projectName, organization);
  selectInProjectMenu('Project Dashboard');
  assertLanguageSettingsNotOnDashboard();
  assertUserSettingsNotOnDashboard();
  gcy('project-menu-items').get(`[aria-label="Projects"]`).should('be.visible');
  gcy('project-menu-items').get(`[aria-label="Export"]`).should('be.visible');
  assertManageMenuItemsNotVisible();
  assertOtherMenuItemsVisible();
  selectInProjectMenu('Translations');
  gcy('global-plus-button').should('not.exist');
  selectFirst();
  assertAvailableCommands(['Move']);
  move('leftarrow');
  assertAvailableCommands(['Move']);
};
