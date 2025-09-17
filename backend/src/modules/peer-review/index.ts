import {sharedContainerModule} from '#root/container.js';
import {Container, ContainerModule} from 'inversify';
import {InversifyAdapter} from '#root/inversify-adapter.js';
import {useContainer} from 'class-validator';
import {ReviewerController} from './controllers/ReviewerController.js';

// Export names that loadAppModules expects
export const peerReviewModuleControllers: Function[] = [
  ReviewerController,
];

// Export container modules for loadAppModules
export const peerReviewContainerModules: ContainerModule[] = [
  sharedContainerModule,
];

// This sets up Inversify bindings for the peer-review module
export async function setupPeerReviewContainer(): Promise<void> {
  const container = new Container();
  await container.load(...peerReviewContainerModules);
  const inversifyAdapter = new InversifyAdapter(container);
  useContainer(inversifyAdapter);
}

export const peerReviewModuleValidators: Function[] = [
  // Add validators here if needed
];

// Export all the main components for external use
export * from './controllers/ReviewerController.js';
