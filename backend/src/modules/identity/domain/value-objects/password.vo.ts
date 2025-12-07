// =============================================================================
// Password Value Object
// =============================================================================
// Encapsule le hachage et la validation des mots de passe
//
// Règles de sécurité:
// - Minimum 8 caractères
// - Au moins une majuscule
// - Au moins une minuscule
// - Au moins un chiffre
//
// Le mot de passe est TOUJOURS stocké haché (bcrypt)
// =============================================================================

import { ValueObject } from '@shared/ddd';
import * as bcrypt from 'bcrypt';

interface PasswordProps {
  value: string; // Hash bcrypt, jamais le mot de passe en clair
  isHashed: boolean;
}

export class Password extends ValueObject<PasswordProps> {
  private static readonly SALT_ROUNDS = 12;
  private static readonly MIN_LENGTH = 8;

  private constructor(props: PasswordProps) {
    super(props);
  }

  /**
   * Retourne le hash du mot de passe
   */
  get value(): string {
    return this.props.value;
  }

  /**
   * Crée un Password à partir d'un mot de passe en clair
   * Le mot de passe sera automatiquement haché
   *
   * @throws Error si le mot de passe ne respecte pas les règles
   */
  static async create(plainPassword: string): Promise<Password> {
    Password.validate(plainPassword);

    const hashedPassword = await bcrypt.hash(plainPassword, this.SALT_ROUNDS);

    return new Password({
      value: hashedPassword,
      isHashed: true,
    });
  }

  /**
   * Reconstruit un Password depuis la base de données
   * Le mot de passe est déjà haché
   */
  static fromPersistence(hashedPassword: string): Password {
    return new Password({
      value: hashedPassword,
      isHashed: true,
    });
  }

  /**
   * Valide les règles du mot de passe
   * @throws Error si les règles ne sont pas respectées
   */
  private static validate(password: string): void {
    const errors: string[] = [];

    if (!password || password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    if (errors.length > 0) {
      throw new Error(`Invalid password: ${errors.join(', ')}`);
    }
  }

  /**
   * Compare un mot de passe en clair avec le hash
   */
  async compare(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.props.value);
  }

  /**
   * Retourne le hash (pour persistance)
   */
  toString(): string {
    return this.props.value;
  }
}
