import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AdminListAuditLogsParams, AdminListSupportTicketsParams, AdminListUsersParams, AdminListWebsitesParams, AdminStats, AdminUserList, AuditLogList, Category, CategoryInput, CategoryReorderInput, CategoryUpdate, CheckoutInput, CheckoutSession, CitizenVotePost, CitizenVotePostInput, CitizenVotePostList, HealthStatus, ListCitizenVotePostsParams, ListTalkPostsParams, ListWebsitesParams, Membership, MembershipUpdate, Notification, NotificationInput, PortalSession, SupportTicket, SupportTicketAdminUpdate, SupportTicketInput, TabReorderInput, TalkCategory, TalkComment, TalkCommentInput, TalkPost, TalkPostInput, TalkPostsPage, TalkVoteResult, UpvoteResult, UserProfile, UserProfileUpdate, VoteMetadata, Website, WebsiteInput, WebsitePref, WebsitePrefInput, WebsiteUpdate, WebviewSettings, WebviewSettingsUpdate } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListCategoriesUrl: () => string;
/**
 * @summary List all active categories
 */
export declare const listCategories: (options?: RequestInit) => Promise<Category[]>;
export declare const getListCategoriesQueryKey: () => readonly ["/api/categories"];
export declare const getListCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof listCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof listCategories>>>;
export type ListCategoriesQueryError = ErrorType<unknown>;
/**
 * @summary List all active categories
 */
export declare function useListCategories<TData = Awaited<ReturnType<typeof listCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListWebsitesUrl: (params?: ListWebsitesParams) => string;
/**
 * @summary List websites
 */
export declare const listWebsites: (params?: ListWebsitesParams, options?: RequestInit) => Promise<Website[]>;
export declare const getListWebsitesQueryKey: (params?: ListWebsitesParams) => readonly ["/api/websites", ...ListWebsitesParams[]];
export declare const getListWebsitesQueryOptions: <TData = Awaited<ReturnType<typeof listWebsites>>, TError = ErrorType<unknown>>(params?: ListWebsitesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWebsites>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listWebsites>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListWebsitesQueryResult = NonNullable<Awaited<ReturnType<typeof listWebsites>>>;
export type ListWebsitesQueryError = ErrorType<unknown>;
/**
 * @summary List websites
 */
export declare function useListWebsites<TData = Awaited<ReturnType<typeof listWebsites>>, TError = ErrorType<unknown>>(params?: ListWebsitesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWebsites>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetWebsiteUrl: (id: number) => string;
/**
 * @summary Get a single website
 */
export declare const getWebsite: (id: number, options?: RequestInit) => Promise<Website>;
export declare const getGetWebsiteQueryKey: (id: number) => readonly [`/api/websites/${number}`];
export declare const getGetWebsiteQueryOptions: <TData = Awaited<ReturnType<typeof getWebsite>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWebsite>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getWebsite>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetWebsiteQueryResult = NonNullable<Awaited<ReturnType<typeof getWebsite>>>;
export type GetWebsiteQueryError = ErrorType<void>;
/**
 * @summary Get a single website
 */
export declare function useGetWebsite<TData = Awaited<ReturnType<typeof getWebsite>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getWebsite>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetUserProfileUrl: () => string;
/**
 * @summary Get current user profile
 */
export declare const getUserProfile: (options?: RequestInit) => Promise<UserProfile>;
export declare const getGetUserProfileQueryKey: () => readonly ["/api/user/profile"];
export declare const getGetUserProfileQueryOptions: <TData = Awaited<ReturnType<typeof getUserProfile>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserProfile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUserProfile>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserProfileQueryResult = NonNullable<Awaited<ReturnType<typeof getUserProfile>>>;
export type GetUserProfileQueryError = ErrorType<void>;
/**
 * @summary Get current user profile
 */
export declare function useGetUserProfile<TData = Awaited<ReturnType<typeof getUserProfile>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserProfile>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateUserProfileUrl: () => string;
/**
 * @summary Update user profile
 */
export declare const updateUserProfile: (userProfileUpdate: UserProfileUpdate, options?: RequestInit) => Promise<UserProfile>;
export declare const getUpdateUserProfileMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUserProfile>>, TError, {
        data: BodyType<UserProfileUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateUserProfile>>, TError, {
    data: BodyType<UserProfileUpdate>;
}, TContext>;
export type UpdateUserProfileMutationResult = NonNullable<Awaited<ReturnType<typeof updateUserProfile>>>;
export type UpdateUserProfileMutationBody = BodyType<UserProfileUpdate>;
export type UpdateUserProfileMutationError = ErrorType<unknown>;
/**
* @summary Update user profile
*/
export declare const useUpdateUserProfile: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUserProfile>>, TError, {
        data: BodyType<UserProfileUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateUserProfile>>, TError, {
    data: BodyType<UserProfileUpdate>;
}, TContext>;
export declare const getGetUserMembershipUrl: () => string;
/**
 * @summary Get user membership status
 */
export declare const getUserMembership: (options?: RequestInit) => Promise<Membership>;
export declare const getGetUserMembershipQueryKey: () => readonly ["/api/user/membership"];
export declare const getGetUserMembershipQueryOptions: <TData = Awaited<ReturnType<typeof getUserMembership>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserMembership>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUserMembership>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserMembershipQueryResult = NonNullable<Awaited<ReturnType<typeof getUserMembership>>>;
export type GetUserMembershipQueryError = ErrorType<void>;
/**
 * @summary Get user membership status
 */
export declare function useGetUserMembership<TData = Awaited<ReturnType<typeof getUserMembership>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserMembership>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateCheckoutSessionUrl: () => string;
/**
 * @summary Create Stripe checkout session
 */
export declare const createCheckoutSession: (checkoutInput: CheckoutInput, options?: RequestInit) => Promise<CheckoutSession>;
export declare const getCreateCheckoutSessionMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCheckoutSession>>, TError, {
        data: BodyType<CheckoutInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCheckoutSession>>, TError, {
    data: BodyType<CheckoutInput>;
}, TContext>;
export type CreateCheckoutSessionMutationResult = NonNullable<Awaited<ReturnType<typeof createCheckoutSession>>>;
export type CreateCheckoutSessionMutationBody = BodyType<CheckoutInput>;
export type CreateCheckoutSessionMutationError = ErrorType<void>;
/**
* @summary Create Stripe checkout session
*/
export declare const useCreateCheckoutSession: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCheckoutSession>>, TError, {
        data: BodyType<CheckoutInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCheckoutSession>>, TError, {
    data: BodyType<CheckoutInput>;
}, TContext>;
export declare const getCreatePortalSessionUrl: () => string;
/**
 * @summary Create Stripe customer portal session
 */
export declare const createPortalSession: (options?: RequestInit) => Promise<PortalSession>;
export declare const getCreatePortalSessionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPortalSession>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPortalSession>>, TError, void, TContext>;
export type CreatePortalSessionMutationResult = NonNullable<Awaited<ReturnType<typeof createPortalSession>>>;
export type CreatePortalSessionMutationError = ErrorType<unknown>;
/**
* @summary Create Stripe customer portal session
*/
export declare const useCreatePortalSession: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPortalSession>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPortalSession>>, TError, void, TContext>;
export declare const getGetUserPrefsUrl: () => string;
/**
 * @summary Get all user website preferences
 */
export declare const getUserPrefs: (options?: RequestInit) => Promise<WebsitePref[]>;
export declare const getGetUserPrefsQueryKey: () => readonly ["/api/user/prefs"];
export declare const getGetUserPrefsQueryOptions: <TData = Awaited<ReturnType<typeof getUserPrefs>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserPrefs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getUserPrefs>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetUserPrefsQueryResult = NonNullable<Awaited<ReturnType<typeof getUserPrefs>>>;
export type GetUserPrefsQueryError = ErrorType<unknown>;
/**
 * @summary Get all user website preferences
 */
export declare function useGetUserPrefs<TData = Awaited<ReturnType<typeof getUserPrefs>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getUserPrefs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpsertWebsitePrefUrl: () => string;
/**
 * @summary Upsert a website preference
 */
export declare const upsertWebsitePref: (websitePrefInput: WebsitePrefInput, options?: RequestInit) => Promise<WebsitePref>;
export declare const getUpsertWebsitePrefMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upsertWebsitePref>>, TError, {
        data: BodyType<WebsitePrefInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof upsertWebsitePref>>, TError, {
    data: BodyType<WebsitePrefInput>;
}, TContext>;
export type UpsertWebsitePrefMutationResult = NonNullable<Awaited<ReturnType<typeof upsertWebsitePref>>>;
export type UpsertWebsitePrefMutationBody = BodyType<WebsitePrefInput>;
export type UpsertWebsitePrefMutationError = ErrorType<unknown>;
/**
* @summary Upsert a website preference
*/
export declare const useUpsertWebsitePref: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upsertWebsitePref>>, TError, {
        data: BodyType<WebsitePrefInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof upsertWebsitePref>>, TError, {
    data: BodyType<WebsitePrefInput>;
}, TContext>;
export declare const getReorderUserTabsUrl: () => string;
/**
 * @summary Reorder user website tabs
 */
export declare const reorderUserTabs: (tabReorderInput: TabReorderInput, options?: RequestInit) => Promise<void>;
export declare const getReorderUserTabsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reorderUserTabs>>, TError, {
        data: BodyType<TabReorderInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof reorderUserTabs>>, TError, {
    data: BodyType<TabReorderInput>;
}, TContext>;
export type ReorderUserTabsMutationResult = NonNullable<Awaited<ReturnType<typeof reorderUserTabs>>>;
export type ReorderUserTabsMutationBody = BodyType<TabReorderInput>;
export type ReorderUserTabsMutationError = ErrorType<unknown>;
/**
* @summary Reorder user website tabs
*/
export declare const useReorderUserTabs: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reorderUserTabs>>, TError, {
        data: BodyType<TabReorderInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof reorderUserTabs>>, TError, {
    data: BodyType<TabReorderInput>;
}, TContext>;
export declare const getListCitizenVotePostsUrl: (params?: ListCitizenVotePostsParams) => string;
/**
 * @summary List citizen vote posts
 */
export declare const listCitizenVotePosts: (params?: ListCitizenVotePostsParams, options?: RequestInit) => Promise<CitizenVotePostList>;
export declare const getListCitizenVotePostsQueryKey: (params?: ListCitizenVotePostsParams) => readonly ["/api/citizen-vote/posts", ...ListCitizenVotePostsParams[]];
export declare const getListCitizenVotePostsQueryOptions: <TData = Awaited<ReturnType<typeof listCitizenVotePosts>>, TError = ErrorType<unknown>>(params?: ListCitizenVotePostsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCitizenVotePosts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCitizenVotePosts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCitizenVotePostsQueryResult = NonNullable<Awaited<ReturnType<typeof listCitizenVotePosts>>>;
export type ListCitizenVotePostsQueryError = ErrorType<unknown>;
/**
 * @summary List citizen vote posts
 */
export declare function useListCitizenVotePosts<TData = Awaited<ReturnType<typeof listCitizenVotePosts>>, TError = ErrorType<unknown>>(params?: ListCitizenVotePostsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCitizenVotePosts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateCitizenVotePostUrl: () => string;
/**
 * @summary Create a citizen vote post
 */
export declare const createCitizenVotePost: (citizenVotePostInput: CitizenVotePostInput, options?: RequestInit) => Promise<CitizenVotePost>;
export declare const getCreateCitizenVotePostMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCitizenVotePost>>, TError, {
        data: BodyType<CitizenVotePostInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCitizenVotePost>>, TError, {
    data: BodyType<CitizenVotePostInput>;
}, TContext>;
export type CreateCitizenVotePostMutationResult = NonNullable<Awaited<ReturnType<typeof createCitizenVotePost>>>;
export type CreateCitizenVotePostMutationBody = BodyType<CitizenVotePostInput>;
export type CreateCitizenVotePostMutationError = ErrorType<unknown>;
/**
* @summary Create a citizen vote post
*/
export declare const useCreateCitizenVotePost: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCitizenVotePost>>, TError, {
        data: BodyType<CitizenVotePostInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCitizenVotePost>>, TError, {
    data: BodyType<CitizenVotePostInput>;
}, TContext>;
export declare const getUpvoteCitizenVotePostUrl: (id: number) => string;
/**
 * @summary Toggle upvote on a post
 */
export declare const upvoteCitizenVotePost: (id: number, options?: RequestInit) => Promise<UpvoteResult>;
export declare const getUpvoteCitizenVotePostMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upvoteCitizenVotePost>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof upvoteCitizenVotePost>>, TError, {
    id: number;
}, TContext>;
export type UpvoteCitizenVotePostMutationResult = NonNullable<Awaited<ReturnType<typeof upvoteCitizenVotePost>>>;
export type UpvoteCitizenVotePostMutationError = ErrorType<unknown>;
/**
* @summary Toggle upvote on a post
*/
export declare const useUpvoteCitizenVotePost: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof upvoteCitizenVotePost>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof upvoteCitizenVotePost>>, TError, {
    id: number;
}, TContext>;
export declare const getListVoteCategoriesUrl: () => string;
/**
 * @summary List vote categories and geo options
 */
export declare const listVoteCategories: (options?: RequestInit) => Promise<VoteMetadata>;
export declare const getListVoteCategoriesQueryKey: () => readonly ["/api/citizen-vote/categories"];
export declare const getListVoteCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof listVoteCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listVoteCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listVoteCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListVoteCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof listVoteCategories>>>;
export type ListVoteCategoriesQueryError = ErrorType<unknown>;
/**
 * @summary List vote categories and geo options
 */
export declare function useListVoteCategories<TData = Awaited<ReturnType<typeof listVoteCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listVoteCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListSupportTicketsUrl: () => string;
/**
 * @summary List user support tickets
 */
export declare const listSupportTickets: (options?: RequestInit) => Promise<SupportTicket[]>;
export declare const getListSupportTicketsQueryKey: () => readonly ["/api/support/tickets"];
export declare const getListSupportTicketsQueryOptions: <TData = Awaited<ReturnType<typeof listSupportTickets>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSupportTickets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSupportTickets>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSupportTicketsQueryResult = NonNullable<Awaited<ReturnType<typeof listSupportTickets>>>;
export type ListSupportTicketsQueryError = ErrorType<unknown>;
/**
 * @summary List user support tickets
 */
export declare function useListSupportTickets<TData = Awaited<ReturnType<typeof listSupportTickets>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSupportTickets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateSupportTicketUrl: () => string;
/**
 * @summary Create a support ticket
 */
export declare const createSupportTicket: (supportTicketInput: SupportTicketInput, options?: RequestInit) => Promise<SupportTicket>;
export declare const getCreateSupportTicketMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSupportTicket>>, TError, {
        data: BodyType<SupportTicketInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSupportTicket>>, TError, {
    data: BodyType<SupportTicketInput>;
}, TContext>;
export type CreateSupportTicketMutationResult = NonNullable<Awaited<ReturnType<typeof createSupportTicket>>>;
export type CreateSupportTicketMutationBody = BodyType<SupportTicketInput>;
export type CreateSupportTicketMutationError = ErrorType<unknown>;
/**
* @summary Create a support ticket
*/
export declare const useCreateSupportTicket: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSupportTicket>>, TError, {
        data: BodyType<SupportTicketInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSupportTicket>>, TError, {
    data: BodyType<SupportTicketInput>;
}, TContext>;
export declare const getListNotificationsUrl: () => string;
/**
 * @summary List user notifications
 */
export declare const listNotifications: (options?: RequestInit) => Promise<Notification[]>;
export declare const getListNotificationsQueryKey: () => readonly ["/api/notifications"];
export declare const getListNotificationsQueryOptions: <TData = Awaited<ReturnType<typeof listNotifications>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listNotifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listNotifications>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListNotificationsQueryResult = NonNullable<Awaited<ReturnType<typeof listNotifications>>>;
export type ListNotificationsQueryError = ErrorType<unknown>;
/**
 * @summary List user notifications
 */
export declare function useListNotifications<TData = Awaited<ReturnType<typeof listNotifications>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listNotifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getMarkNotificationReadUrl: (id: number) => string;
/**
 * @summary Mark a notification as read
 */
export declare const markNotificationRead: (id: number, options?: RequestInit) => Promise<void>;
export declare const getMarkNotificationReadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
    id: number;
}, TContext>;
export type MarkNotificationReadMutationResult = NonNullable<Awaited<ReturnType<typeof markNotificationRead>>>;
export type MarkNotificationReadMutationError = ErrorType<unknown>;
/**
* @summary Mark a notification as read
*/
export declare const useMarkNotificationRead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markNotificationRead>>, TError, {
    id: number;
}, TContext>;
export declare const getMarkAllNotificationsReadUrl: () => string;
/**
 * @summary Mark all notifications as read
 */
export declare const markAllNotificationsRead: (options?: RequestInit) => Promise<void>;
export declare const getMarkAllNotificationsReadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
export type MarkAllNotificationsReadMutationResult = NonNullable<Awaited<ReturnType<typeof markAllNotificationsRead>>>;
export type MarkAllNotificationsReadMutationError = ErrorType<unknown>;
/**
* @summary Mark all notifications as read
*/
export declare const useMarkAllNotificationsRead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof markAllNotificationsRead>>, TError, void, TContext>;
export declare const getStripeWebhookUrl: () => string;
/**
 * @summary Stripe webhook handler
 */
export declare const stripeWebhook: (options?: RequestInit) => Promise<void>;
export declare const getStripeWebhookMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof stripeWebhook>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof stripeWebhook>>, TError, void, TContext>;
export type StripeWebhookMutationResult = NonNullable<Awaited<ReturnType<typeof stripeWebhook>>>;
export type StripeWebhookMutationError = ErrorType<unknown>;
/**
* @summary Stripe webhook handler
*/
export declare const useStripeWebhook: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof stripeWebhook>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof stripeWebhook>>, TError, void, TContext>;
export declare const getAdminListCategoriesUrl: () => string;
/**
 * @summary Admin list all categories
 */
export declare const adminListCategories: (options?: RequestInit) => Promise<Category[]>;
export declare const getAdminListCategoriesQueryKey: () => readonly ["/api/admin/categories"];
export declare const getAdminListCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof adminListCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof adminListCategories>>>;
export type AdminListCategoriesQueryError = ErrorType<unknown>;
/**
 * @summary Admin list all categories
 */
export declare function useAdminListCategories<TData = Awaited<ReturnType<typeof adminListCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminCreateCategoryUrl: () => string;
/**
 * @summary Create a category
 */
export declare const adminCreateCategory: (categoryInput: CategoryInput, options?: RequestInit) => Promise<Category>;
export declare const getAdminCreateCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateCategory>>, TError, {
        data: BodyType<CategoryInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminCreateCategory>>, TError, {
    data: BodyType<CategoryInput>;
}, TContext>;
export type AdminCreateCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof adminCreateCategory>>>;
export type AdminCreateCategoryMutationBody = BodyType<CategoryInput>;
export type AdminCreateCategoryMutationError = ErrorType<unknown>;
/**
* @summary Create a category
*/
export declare const useAdminCreateCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateCategory>>, TError, {
        data: BodyType<CategoryInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminCreateCategory>>, TError, {
    data: BodyType<CategoryInput>;
}, TContext>;
export declare const getAdminUpdateCategoryUrl: (id: number) => string;
/**
 * @summary Update a category
 */
export declare const adminUpdateCategory: (id: number, categoryUpdate: CategoryUpdate, options?: RequestInit) => Promise<Category>;
export declare const getAdminUpdateCategoryMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateCategory>>, TError, {
        id: number;
        data: BodyType<CategoryUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateCategory>>, TError, {
    id: number;
    data: BodyType<CategoryUpdate>;
}, TContext>;
export type AdminUpdateCategoryMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateCategory>>>;
export type AdminUpdateCategoryMutationBody = BodyType<CategoryUpdate>;
export type AdminUpdateCategoryMutationError = ErrorType<unknown>;
/**
* @summary Update a category
*/
export declare const useAdminUpdateCategory: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateCategory>>, TError, {
        id: number;
        data: BodyType<CategoryUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateCategory>>, TError, {
    id: number;
    data: BodyType<CategoryUpdate>;
}, TContext>;
export declare const getAdminReorderCategoriesUrl: () => string;
/**
 * @summary Reorder categories
 */
export declare const adminReorderCategories: (categoryReorderInput: CategoryReorderInput, options?: RequestInit) => Promise<void>;
export declare const getAdminReorderCategoriesMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminReorderCategories>>, TError, {
        data: BodyType<CategoryReorderInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminReorderCategories>>, TError, {
    data: BodyType<CategoryReorderInput>;
}, TContext>;
export type AdminReorderCategoriesMutationResult = NonNullable<Awaited<ReturnType<typeof adminReorderCategories>>>;
export type AdminReorderCategoriesMutationBody = BodyType<CategoryReorderInput>;
export type AdminReorderCategoriesMutationError = ErrorType<unknown>;
/**
* @summary Reorder categories
*/
export declare const useAdminReorderCategories: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminReorderCategories>>, TError, {
        data: BodyType<CategoryReorderInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminReorderCategories>>, TError, {
    data: BodyType<CategoryReorderInput>;
}, TContext>;
export declare const getAdminListWebsitesUrl: (params?: AdminListWebsitesParams) => string;
/**
 * @summary Admin list all websites
 */
export declare const adminListWebsites: (params?: AdminListWebsitesParams, options?: RequestInit) => Promise<Website[]>;
export declare const getAdminListWebsitesQueryKey: (params?: AdminListWebsitesParams) => readonly ["/api/admin/websites", ...AdminListWebsitesParams[]];
export declare const getAdminListWebsitesQueryOptions: <TData = Awaited<ReturnType<typeof adminListWebsites>>, TError = ErrorType<unknown>>(params?: AdminListWebsitesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListWebsites>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListWebsites>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListWebsitesQueryResult = NonNullable<Awaited<ReturnType<typeof adminListWebsites>>>;
export type AdminListWebsitesQueryError = ErrorType<unknown>;
/**
 * @summary Admin list all websites
 */
export declare function useAdminListWebsites<TData = Awaited<ReturnType<typeof adminListWebsites>>, TError = ErrorType<unknown>>(params?: AdminListWebsitesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListWebsites>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminCreateWebsiteUrl: () => string;
/**
 * @summary Create a website
 */
export declare const adminCreateWebsite: (websiteInput: WebsiteInput, options?: RequestInit) => Promise<Website>;
export declare const getAdminCreateWebsiteMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateWebsite>>, TError, {
        data: BodyType<WebsiteInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminCreateWebsite>>, TError, {
    data: BodyType<WebsiteInput>;
}, TContext>;
export type AdminCreateWebsiteMutationResult = NonNullable<Awaited<ReturnType<typeof adminCreateWebsite>>>;
export type AdminCreateWebsiteMutationBody = BodyType<WebsiteInput>;
export type AdminCreateWebsiteMutationError = ErrorType<unknown>;
/**
* @summary Create a website
*/
export declare const useAdminCreateWebsite: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminCreateWebsite>>, TError, {
        data: BodyType<WebsiteInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminCreateWebsite>>, TError, {
    data: BodyType<WebsiteInput>;
}, TContext>;
export declare const getAdminUpdateWebsiteUrl: (id: number) => string;
/**
 * @summary Update a website
 */
export declare const adminUpdateWebsite: (id: number, websiteUpdate: WebsiteUpdate, options?: RequestInit) => Promise<Website>;
export declare const getAdminUpdateWebsiteMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateWebsite>>, TError, {
        id: number;
        data: BodyType<WebsiteUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateWebsite>>, TError, {
    id: number;
    data: BodyType<WebsiteUpdate>;
}, TContext>;
export type AdminUpdateWebsiteMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateWebsite>>>;
export type AdminUpdateWebsiteMutationBody = BodyType<WebsiteUpdate>;
export type AdminUpdateWebsiteMutationError = ErrorType<unknown>;
/**
* @summary Update a website
*/
export declare const useAdminUpdateWebsite: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateWebsite>>, TError, {
        id: number;
        data: BodyType<WebsiteUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateWebsite>>, TError, {
    id: number;
    data: BodyType<WebsiteUpdate>;
}, TContext>;
export declare const getAdminListUsersUrl: (params?: AdminListUsersParams) => string;
/**
 * @summary Admin list all users
 */
export declare const adminListUsers: (params?: AdminListUsersParams, options?: RequestInit) => Promise<AdminUserList>;
export declare const getAdminListUsersQueryKey: (params?: AdminListUsersParams) => readonly ["/api/admin/users", ...AdminListUsersParams[]];
export declare const getAdminListUsersQueryOptions: <TData = Awaited<ReturnType<typeof adminListUsers>>, TError = ErrorType<unknown>>(params?: AdminListUsersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListUsers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListUsersQueryResult = NonNullable<Awaited<ReturnType<typeof adminListUsers>>>;
export type AdminListUsersQueryError = ErrorType<unknown>;
/**
 * @summary Admin list all users
 */
export declare function useAdminListUsers<TData = Awaited<ReturnType<typeof adminListUsers>>, TError = ErrorType<unknown>>(params?: AdminListUsersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminUpdateUserMembershipUrl: (userId: string) => string;
/**
 * @summary Update user membership
 */
export declare const adminUpdateUserMembership: (userId: string, membershipUpdate: MembershipUpdate, options?: RequestInit) => Promise<Membership>;
export declare const getAdminUpdateUserMembershipMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateUserMembership>>, TError, {
        userId: string;
        data: BodyType<MembershipUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateUserMembership>>, TError, {
    userId: string;
    data: BodyType<MembershipUpdate>;
}, TContext>;
export type AdminUpdateUserMembershipMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateUserMembership>>>;
export type AdminUpdateUserMembershipMutationBody = BodyType<MembershipUpdate>;
export type AdminUpdateUserMembershipMutationError = ErrorType<unknown>;
/**
* @summary Update user membership
*/
export declare const useAdminUpdateUserMembership: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateUserMembership>>, TError, {
        userId: string;
        data: BodyType<MembershipUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateUserMembership>>, TError, {
    userId: string;
    data: BodyType<MembershipUpdate>;
}, TContext>;
export declare const getAdminListSupportTicketsUrl: (params?: AdminListSupportTicketsParams) => string;
/**
 * @summary Admin list all support tickets
 */
export declare const adminListSupportTickets: (params?: AdminListSupportTicketsParams, options?: RequestInit) => Promise<SupportTicket[]>;
export declare const getAdminListSupportTicketsQueryKey: (params?: AdminListSupportTicketsParams) => readonly ["/api/admin/support/tickets", ...AdminListSupportTicketsParams[]];
export declare const getAdminListSupportTicketsQueryOptions: <TData = Awaited<ReturnType<typeof adminListSupportTickets>>, TError = ErrorType<unknown>>(params?: AdminListSupportTicketsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListSupportTickets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListSupportTickets>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListSupportTicketsQueryResult = NonNullable<Awaited<ReturnType<typeof adminListSupportTickets>>>;
export type AdminListSupportTicketsQueryError = ErrorType<unknown>;
/**
 * @summary Admin list all support tickets
 */
export declare function useAdminListSupportTickets<TData = Awaited<ReturnType<typeof adminListSupportTickets>>, TError = ErrorType<unknown>>(params?: AdminListSupportTicketsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListSupportTickets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminUpdateSupportTicketUrl: (id: number) => string;
/**
 * @summary Update support ticket (reply, close)
 */
export declare const adminUpdateSupportTicket: (id: number, supportTicketAdminUpdate: SupportTicketAdminUpdate, options?: RequestInit) => Promise<SupportTicket>;
export declare const getAdminUpdateSupportTicketMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateSupportTicket>>, TError, {
        id: number;
        data: BodyType<SupportTicketAdminUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateSupportTicket>>, TError, {
    id: number;
    data: BodyType<SupportTicketAdminUpdate>;
}, TContext>;
export type AdminUpdateSupportTicketMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateSupportTicket>>>;
export type AdminUpdateSupportTicketMutationBody = BodyType<SupportTicketAdminUpdate>;
export type AdminUpdateSupportTicketMutationError = ErrorType<unknown>;
/**
* @summary Update support ticket (reply, close)
*/
export declare const useAdminUpdateSupportTicket: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateSupportTicket>>, TError, {
        id: number;
        data: BodyType<SupportTicketAdminUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateSupportTicket>>, TError, {
    id: number;
    data: BodyType<SupportTicketAdminUpdate>;
}, TContext>;
export declare const getAdminGetStatsUrl: () => string;
/**
 * @summary Get admin dashboard stats
 */
export declare const adminGetStats: (options?: RequestInit) => Promise<AdminStats>;
export declare const getAdminGetStatsQueryKey: () => readonly ["/api/admin/stats"];
export declare const getAdminGetStatsQueryOptions: <TData = Awaited<ReturnType<typeof adminGetStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminGetStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminGetStatsQueryResult = NonNullable<Awaited<ReturnType<typeof adminGetStats>>>;
export type AdminGetStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get admin dashboard stats
 */
export declare function useAdminGetStats<TData = Awaited<ReturnType<typeof adminGetStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminGetWebviewSettingsUrl: () => string;
/**
 * @summary Get global WebView settings
 */
export declare const adminGetWebviewSettings: (options?: RequestInit) => Promise<WebviewSettings>;
export declare const getAdminGetWebviewSettingsQueryKey: () => readonly ["/api/admin/webview-settings"];
export declare const getAdminGetWebviewSettingsQueryOptions: <TData = Awaited<ReturnType<typeof adminGetWebviewSettings>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetWebviewSettings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminGetWebviewSettings>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminGetWebviewSettingsQueryResult = NonNullable<Awaited<ReturnType<typeof adminGetWebviewSettings>>>;
export type AdminGetWebviewSettingsQueryError = ErrorType<unknown>;
/**
 * @summary Get global WebView settings
 */
export declare function useAdminGetWebviewSettings<TData = Awaited<ReturnType<typeof adminGetWebviewSettings>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminGetWebviewSettings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminUpdateWebviewSettingsUrl: () => string;
/**
 * @summary Update global WebView settings
 */
export declare const adminUpdateWebviewSettings: (webviewSettingsUpdate: WebviewSettingsUpdate, options?: RequestInit) => Promise<WebviewSettings>;
export declare const getAdminUpdateWebviewSettingsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateWebviewSettings>>, TError, {
        data: BodyType<WebviewSettingsUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminUpdateWebviewSettings>>, TError, {
    data: BodyType<WebviewSettingsUpdate>;
}, TContext>;
export type AdminUpdateWebviewSettingsMutationResult = NonNullable<Awaited<ReturnType<typeof adminUpdateWebviewSettings>>>;
export type AdminUpdateWebviewSettingsMutationBody = BodyType<WebviewSettingsUpdate>;
export type AdminUpdateWebviewSettingsMutationError = ErrorType<unknown>;
/**
* @summary Update global WebView settings
*/
export declare const useAdminUpdateWebviewSettings: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminUpdateWebviewSettings>>, TError, {
        data: BodyType<WebviewSettingsUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminUpdateWebviewSettings>>, TError, {
    data: BodyType<WebviewSettingsUpdate>;
}, TContext>;
export declare const getAdminListAuditLogsUrl: (params?: AdminListAuditLogsParams) => string;
/**
 * @summary List audit logs
 */
export declare const adminListAuditLogs: (params?: AdminListAuditLogsParams, options?: RequestInit) => Promise<AuditLogList>;
export declare const getAdminListAuditLogsQueryKey: (params?: AdminListAuditLogsParams) => readonly ["/api/admin/audit-logs", ...AdminListAuditLogsParams[]];
export declare const getAdminListAuditLogsQueryOptions: <TData = Awaited<ReturnType<typeof adminListAuditLogs>>, TError = ErrorType<unknown>>(params?: AdminListAuditLogsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListAuditLogs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof adminListAuditLogs>>, TError, TData> & {
    queryKey: QueryKey;
};
export type AdminListAuditLogsQueryResult = NonNullable<Awaited<ReturnType<typeof adminListAuditLogs>>>;
export type AdminListAuditLogsQueryError = ErrorType<unknown>;
/**
 * @summary List audit logs
 */
export declare function useAdminListAuditLogs<TData = Awaited<ReturnType<typeof adminListAuditLogs>>, TError = ErrorType<unknown>>(params?: AdminListAuditLogsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof adminListAuditLogs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAdminSendNotificationUrl: () => string;
/**
 * @summary Send notification to user(s)
 */
export declare const adminSendNotification: (notificationInput: NotificationInput, options?: RequestInit) => Promise<void>;
export declare const getAdminSendNotificationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminSendNotification>>, TError, {
        data: BodyType<NotificationInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adminSendNotification>>, TError, {
    data: BodyType<NotificationInput>;
}, TContext>;
export type AdminSendNotificationMutationResult = NonNullable<Awaited<ReturnType<typeof adminSendNotification>>>;
export type AdminSendNotificationMutationBody = BodyType<NotificationInput>;
export type AdminSendNotificationMutationError = ErrorType<unknown>;
/**
* @summary Send notification to user(s)
*/
export declare const useAdminSendNotification: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adminSendNotification>>, TError, {
        data: BodyType<NotificationInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adminSendNotification>>, TError, {
    data: BodyType<NotificationInput>;
}, TContext>;
export declare const getListTalkCategoriesUrl: () => string;
/**
 * @summary List talk discussion categories
 */
export declare const listTalkCategories: (options?: RequestInit) => Promise<TalkCategory[]>;
export declare const getListTalkCategoriesQueryKey: () => readonly ["/api/talks/categories"];
export declare const getListTalkCategoriesQueryOptions: <TData = Awaited<ReturnType<typeof listTalkCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTalkCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTalkCategories>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTalkCategoriesQueryResult = NonNullable<Awaited<ReturnType<typeof listTalkCategories>>>;
export type ListTalkCategoriesQueryError = ErrorType<unknown>;
/**
 * @summary List talk discussion categories
 */
export declare function useListTalkCategories<TData = Awaited<ReturnType<typeof listTalkCategories>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTalkCategories>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListTalkPostsUrl: (params?: ListTalkPostsParams) => string;
/**
 * @summary List talk posts (paginated)
 */
export declare const listTalkPosts: (params?: ListTalkPostsParams, options?: RequestInit) => Promise<TalkPostsPage>;
export declare const getListTalkPostsQueryKey: (params?: ListTalkPostsParams) => readonly ["/api/talks/posts", ...ListTalkPostsParams[]];
export declare const getListTalkPostsQueryOptions: <TData = Awaited<ReturnType<typeof listTalkPosts>>, TError = ErrorType<unknown>>(params?: ListTalkPostsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTalkPosts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTalkPosts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTalkPostsQueryResult = NonNullable<Awaited<ReturnType<typeof listTalkPosts>>>;
export type ListTalkPostsQueryError = ErrorType<unknown>;
/**
 * @summary List talk posts (paginated)
 */
export declare function useListTalkPosts<TData = Awaited<ReturnType<typeof listTalkPosts>>, TError = ErrorType<unknown>>(params?: ListTalkPostsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTalkPosts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateTalkPostUrl: () => string;
/**
 * @summary Create a new talk post
 */
export declare const createTalkPost: (talkPostInput: TalkPostInput, options?: RequestInit) => Promise<TalkPost>;
export declare const getCreateTalkPostMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTalkPost>>, TError, {
        data: BodyType<TalkPostInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTalkPost>>, TError, {
    data: BodyType<TalkPostInput>;
}, TContext>;
export type CreateTalkPostMutationResult = NonNullable<Awaited<ReturnType<typeof createTalkPost>>>;
export type CreateTalkPostMutationBody = BodyType<TalkPostInput>;
export type CreateTalkPostMutationError = ErrorType<unknown>;
/**
* @summary Create a new talk post
*/
export declare const useCreateTalkPost: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTalkPost>>, TError, {
        data: BodyType<TalkPostInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTalkPost>>, TError, {
    data: BodyType<TalkPostInput>;
}, TContext>;
export declare const getVoteTalkPostUrl: (id: number) => string;
/**
 * @summary Toggle upvote on a talk post
 */
export declare const voteTalkPost: (id: number, options?: RequestInit) => Promise<TalkVoteResult>;
export declare const getVoteTalkPostMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof voteTalkPost>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof voteTalkPost>>, TError, {
    id: number;
}, TContext>;
export type VoteTalkPostMutationResult = NonNullable<Awaited<ReturnType<typeof voteTalkPost>>>;
export type VoteTalkPostMutationError = ErrorType<unknown>;
/**
* @summary Toggle upvote on a talk post
*/
export declare const useVoteTalkPost: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof voteTalkPost>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof voteTalkPost>>, TError, {
    id: number;
}, TContext>;
export declare const getListTalkCommentsUrl: (id: number) => string;
/**
 * @summary List comments on a post
 */
export declare const listTalkComments: (id: number, options?: RequestInit) => Promise<TalkComment[]>;
export declare const getListTalkCommentsQueryKey: (id: number) => readonly [`/api/talks/posts/${number}/comments`];
export declare const getListTalkCommentsQueryOptions: <TData = Awaited<ReturnType<typeof listTalkComments>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTalkComments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTalkComments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTalkCommentsQueryResult = NonNullable<Awaited<ReturnType<typeof listTalkComments>>>;
export type ListTalkCommentsQueryError = ErrorType<unknown>;
/**
 * @summary List comments on a post
 */
export declare function useListTalkComments<TData = Awaited<ReturnType<typeof listTalkComments>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTalkComments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateTalkCommentUrl: (id: number) => string;
/**
 * @summary Add a comment to a talk post
 */
export declare const createTalkComment: (id: number, talkCommentInput: TalkCommentInput, options?: RequestInit) => Promise<TalkComment>;
export declare const getCreateTalkCommentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTalkComment>>, TError, {
        id: number;
        data: BodyType<TalkCommentInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createTalkComment>>, TError, {
    id: number;
    data: BodyType<TalkCommentInput>;
}, TContext>;
export type CreateTalkCommentMutationResult = NonNullable<Awaited<ReturnType<typeof createTalkComment>>>;
export type CreateTalkCommentMutationBody = BodyType<TalkCommentInput>;
export type CreateTalkCommentMutationError = ErrorType<unknown>;
/**
* @summary Add a comment to a talk post
*/
export declare const useCreateTalkComment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createTalkComment>>, TError, {
        id: number;
        data: BodyType<TalkCommentInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createTalkComment>>, TError, {
    id: number;
    data: BodyType<TalkCommentInput>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map