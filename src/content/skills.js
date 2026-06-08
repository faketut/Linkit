// Skills-page bulk-deletion flow.

import { focusClick, waitForElement } from './utils.js';

function findSkillsEditButton() {
  return (
    document.getElementById('navigation-add-edit-deeplink-edit-skills') ||
    document.querySelector('[data-control-name="edit_skills"]') ||
    document.querySelector('button[aria-label*="Edit"]') ||
    null
  );
}

function findSkillsDeleteButton() {
  return (
    document.querySelector('button[aria-label*="Delete"]') ||
    document.querySelector('[data-control-name="delete_skill"]') ||
    Array.from(document.querySelectorAll('button')).find((b) =>
      /^\s*delete\s*$/i.test(b.textContent || ''),
    ) ||
    document.querySelector('[data-control-name="delete"]') ||
    null
  );
}

function findSkillsConfirmButton() {
  return (
    document.querySelector('button[aria-label*="Confirm"]') ||
    document.querySelector('[data-control-name="confirm_delete"]') ||
    Array.from(document.querySelectorAll('button')).find((b) =>
      /^\s*delete\s*$/i.test(b.textContent || ''),
    ) ||
    null
  );
}

function hasSkillsToDelete() {
  return findSkillsEditButton() !== null;
}

async function deleteSingleSkill() {
  try {
    const editButton = findSkillsEditButton();
    if (!editButton) return false;
    focusClick(editButton);

    const deleteButton = await waitForElement(findSkillsDeleteButton, { timeout: 5000 });
    if (!deleteButton) return false;
    focusClick(deleteButton);

    const confirmButton = await waitForElement(findSkillsConfirmButton, {
      timeout: 5000,
    });
    if (!confirmButton) return false;
    focusClick(confirmButton);

    // Wait for the confirm modal to close — signal deletion is complete.
    await waitForElement(() => (findSkillsConfirmButton() ? null : true), {
      timeout: 5000,
    });
    return true;
  } catch (error) {
    console.error('Linkit: error deleting skill:', error);
    return false;
  }
}

async function deleteAllSkills() {
  let deletedCount = 0;
  const maxAttempts = 50;
  let attempts = 0;

  while (hasSkillsToDelete() && attempts < maxAttempts) {
    attempts++;
    const success = await deleteSingleSkill();
    if (!success) break;
    deletedCount++;
    // Wait for the next edit button to appear (or bail out quickly if list is empty).
    await waitForElement(findSkillsEditButton, { timeout: 2000 });
  }
  return deletedCount;
}

export function checkAndDeleteSkills() {
  if (window.location.href.includes('/details/skills/')) {
    deleteAllSkills();
  }
}
