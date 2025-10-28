/**
 * MindFlow TypeScript Type Definitions
 * Provides type safety for the entire application
 */

// ==================== USER & AUTHENTICATION ====================

export type UserRole = 'user' | 'therapist' | 'auditor' | 'admin';

export type UserStatus = 'active' | 'inactive';

export interface UserPermissions {
    canViewAllUsers: boolean;
    canEditUsers: boolean;
    canDeleteUsers: boolean;
    canViewAuditLogs: boolean;
    canManageRoles: boolean;
    canAccessAdminPanel: boolean;
    canViewCrisisAlerts: boolean;
    canManageResources: boolean;
    canExportData: boolean;
    canConfigureSystem: boolean;
    canViewAssignedClients?: boolean;
    canUpdateClientNotes?: boolean;
    canAccessTherapistPortal?: boolean;
    canAccessAuditorPortal?: boolean;
    canGenerateReports?: boolean;
    canAccessUserApp?: boolean;
    canChatWithAI?: boolean;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    status: UserStatus;
    permissions: UserPermissions;
    createdAt: string;
    lastLogin: string | null;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    token?: string;
    user?: User;
    error?: string;
}

// ==================== CONVERSATIONS ====================

export type SentimentType = 'positive' | 'neutral' | 'negative' | 'crisis';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface Conversation {
    id: number;
    userId: string;
    message: string;
    response: string;
    isCrisis: boolean;
    sentiment?: SentimentType;
    timestamp: string;
}

export interface ConversationRequest {
    message: string;
    response: string;
    isCrisis?: boolean;
    sentiment?: SentimentType;
}

// ==================== AUDIT LOGS ====================

export type AuditAction =
    | 'user_registered'
    | 'login_success'
    | 'login_failed'
    | 'logout'
    | 'user_updated'
    | 'user_deleted'
    | 'role_updated'
    | 'crisis_detected'
    | 'password_reset'
    | 'data_exported';

export interface AuditLog {
    id: number;
    userId: string | null;
    action: AuditAction;
    details: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    timestamp: string;
}

// ==================== STATISTICS ====================

export interface SystemStats {
    totalUsers: number;
    totalTherapists: number;
    totalAuditors: number;
    totalConversations: number;
    crisisAlerts24h: number;
}

// ==================== API RESPONSES ====================

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface UsersResponse extends ApiResponse {
    users?: User[];
}

export interface ConversationsResponse extends ApiResponse {
    conversations?: Conversation[];
}

export interface AuditLogsResponse extends ApiResponse {
    logs?: AuditLog[];
}

export interface StatsResponse extends ApiResponse {
    stats?: SystemStats;
}

// ==================== AUTHENTICATION SYSTEM ====================

export interface IAuthenticationSystem {
    // Core methods
    init(): void;
    register(email: string, password: string, fullName: string, role?: UserRole): Promise<AuthResponse>;
    login(email: string, password: string): Promise<AuthResponse>;
    logout(): void;
    
    // Session management
    restoreSession(): boolean;
    refreshSession(): void;
    isAuthenticated(): boolean;
    getCurrentUser(): User | null;
    
    // Password management
    hashPassword(password: string): Promise<string>;
    requestPasswordReset(email: string): Promise<ApiResponse>;
    resetPassword(userId: string, token: string, newPassword: string): Promise<ApiResponse>;
    
    // User management
    getAllUsers(): User[];
    getAllUsersDetailed(): UsersResponse;
    getUserProfile(userId: string): User | null;
    updateUserProfile(userId: string, updates: Partial<User>): ApiResponse;
    deleteAccount(userId: string): ApiResponse;
    
    // Role & Permissions
    getRolePermissions(role: UserRole): UserPermissions;
    hasPermission(permission: keyof UserPermissions): boolean;
    hasRole(role: UserRole): boolean;
    updateUserRole(userId: string, newRole: UserRole): Promise<ApiResponse>;
    getPortalUrl(): string;
    
    // Data management
    exportUserData(userId: string): any;
    validateEmail(email: string): boolean;
    
    // Audit logging
    logAudit(action: AuditAction, data?: any): void;
    getAuditLog(limit?: number): AuditLog[];
    loadAuditLog(): void;
    
    // Encryption
    encrypt(text: string): string;
    decrypt(encrypted: string): string;
}

// ==================== CRISIS DETECTION ====================

export interface CrisisKeyword {
    pattern: RegExp;
    severity: 'high' | 'medium' | 'low';
    category: string;
}

export interface CrisisDetectionResult {
    isCrisis: boolean;
    severity?: 'high' | 'medium' | 'low';
    keywords?: string[];
    confidence?: number;
}

// ==================== RESOURCES ====================

export interface Resource {
    id: string;
    title: string;
    description: string;
    url?: string;
    phone?: string;
    category: 'crisis' | 'therapy' | 'support' | 'education';
    availability: '24/7' | 'business-hours' | 'scheduled';
}

// ==================== ONBOARDING ====================

export interface OnboardingStep {
    id: string;
    title: string;
    content: string;
    completed: boolean;
}

export interface OnboardingState {
    isFirstVisit: boolean;
    isDemoMode: boolean;
    completedSteps: string[];
    lastVisit: string | null;
}

// ==================== HTTP CLIENT ====================

export interface HttpClientConfig {
    baseURL: string;
    timeout?: number;
    headers?: Record<string, string>;
}

export interface HttpClient {
    get<T = any>(url: string, config?: any): Promise<ApiResponse<T>>;
    post<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>>;
    put<T = any>(url: string, data?: any, config?: any): Promise<ApiResponse<T>>;
    delete<T = any>(url: string, config?: any): Promise<ApiResponse<T>>;
}

// ==================== GLOBAL WINDOW EXTENSIONS ====================

declare global {
    interface Window {
        authSystem: IAuthenticationSystem;
        mentalHealthAI: any;
        onboardingSystem: any;
        currentUserId: string | null;
        userDataPrefix: string;
    }
}

// ==================== UTILITY TYPES ====================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ==================== FORM TYPES ====================

export interface LoginFormData {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface SignupFormData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface PasswordResetFormData {
    email: string;
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
}

// ==================== VALIDATION ====================

export interface ValidationRule {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean | string;
}

export interface ValidationRules {
    [field: string]: ValidationRule;
}

export interface ValidationErrors {
    [field: string]: string;
}

// ==================== EXPORT ALL ====================

export * from './types';
