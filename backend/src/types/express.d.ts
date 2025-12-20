// Расширение типов Express для добавления user в Request
declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      globalId: string;
      nickname: string | null;
      email: string | null;
      avatarUrl: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
  }
}
