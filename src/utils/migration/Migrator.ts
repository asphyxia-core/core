export abstract class Migrator {
  public abstract thisVersion(): string;
  public abstract previousVersion(): string;
  public abstract hasPrevious(): boolean;
  public abstract migrate(): boolean;
}
