import {ContainerModule} from 'inversify';
import {
  MongoDatabase,
  // UserRepository,
  HttpErrorHandler,
} from '#shared/index.js';
import {GLOBAL_TYPES} from './types.js';
import {dbConfig} from './config/db.js';
import { FirebaseAuthService } from './modules/auth/services/FirebaseAuthService.js';
import {
  AnswerRepository,
  ContextRepository,
  PeerReviewRepository,
  QuestionRepository,
  ReviewerAssignmentRepository,
  UserRepository,
} from './shared/database/providers/mongo/repositories/index.js';


export const sharedContainerModule = new ContainerModule(options => {
  const uri = dbConfig.url;
  const dbName = dbConfig.dbName;

  options.bind(GLOBAL_TYPES.uri).toConstantValue(uri);
  options.bind(GLOBAL_TYPES.dbName).toConstantValue(dbName);

  // Auth
  options.bind(FirebaseAuthService).toSelf().inSingletonScope();

  // Database
  options.bind(GLOBAL_TYPES.Database).to(MongoDatabase).inSingletonScope();

  // Repositories
  options.bind(GLOBAL_TYPES.AnswerRepository).to(AnswerRepository).inSingletonScope();
  options.bind(GLOBAL_TYPES.ContextRepository).to(ContextRepository).inSingletonScope();
  options.bind(GLOBAL_TYPES.PeerReviewRepository).to(PeerReviewRepository).inSingletonScope();
  options.bind(GLOBAL_TYPES.QuestionRepository).to(QuestionRepository).inSingletonScope();
  options.bind(GLOBAL_TYPES.ReviewerAssignmentRepository).to(ReviewerAssignmentRepository).inSingletonScope();
  options.bind(GLOBAL_TYPES.UserRepository).to(UserRepository).inSingletonScope();

  // Other
  options.bind(HttpErrorHandler).toSelf().inSingletonScope();
}); 

