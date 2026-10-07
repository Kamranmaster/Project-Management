import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AccountPage } from "@/pages/AccountPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { NotFoundPage, RouteErrorPage } from "@/pages/ErrorPages";
import { MembersPage } from "@/pages/project/MembersPage";
import { NotesPage } from "@/pages/project/NotesPage";
import { ProjectLayout } from "@/pages/project/ProjectLayout";
import { ProjectSettingsPage } from "@/pages/project/ProjectSettingsPage";
import { TaskDetailDrawer } from "@/pages/project/TaskDetailDrawer";
import { TasksPage } from "@/pages/project/TasksPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProtectedRoute, PublicOnlyRoute } from "@/routes/guards";

const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          // Only for signed-out users
          {
            element: <PublicOnlyRoute />,
            children: [
              { path: "/login", element: <LoginPage /> },
              { path: "/register", element: <RegisterPage /> },
              { path: "/forgot-password", element: <ForgotPasswordPage /> },
            ],
          },
          // Opened from email links, work whether or not the user is signed in
          { path: "/reset-password/:resetToken", element: <ResetPasswordPage /> },
          { path: "/verify-email/:verificationToken", element: <VerifyEmailPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: "/", element: <Navigate to="/projects" replace /> },
              { path: "/projects", element: <ProjectsPage /> },
              {
                path: "/projects/:projectId",
                element: <ProjectLayout />,
                children: [
                  { index: true, element: <Navigate to="tasks" replace /> },
                  {
                    path: "tasks",
                    element: <TasksPage />,
                    children: [{ path: ":taskId", element: <TaskDetailDrawer /> }],
                  },
                  { path: "notes", element: <NotesPage /> },
                  { path: "members", element: <MembersPage /> },
                  { path: "settings", element: <ProjectSettingsPage /> },
                ],
              },
              { path: "/account", element: <AccountPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
