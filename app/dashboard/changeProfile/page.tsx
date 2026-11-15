"use client";
import {useAdminSession} from "@/components/admin/AdminShell";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { PageHeading } from "@/components/admin/PageHeading";
import { ShieldCheck } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "@/lib/admin-axios";
import { Switch } from "@/components/ui/switch";
import { Resolver } from "react-hook-form";

export default function ChangeProfilePage() {
  const [saving, setSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 定义表单类型
  type FormValues = {
    name?: string;
    account?: string;
    password: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  // 定义请求数据类型
  interface RequestData {
    id?: string;
    oldPassword: string;
    name?: string;
    account?: string;
    newPassword?: string;
    confirmPassword?: string;
  }

  // 动态创建表单验证逻辑
  const createFormSchema = (isChangingPassword: boolean) => {
    const baseSchema = z.object({
      // 姓名和账号可选
      name: z.string().optional(),
      account: z.string().optional(),
      // 只有密码是必填的
      password: z.string().min(2, {
        message: "必须输入当前密码以验证身份",
      }),
      // 始终包含这些字段，但仅在修改密码时才验证
      newPassword: z.string().optional(),
      confirmPassword: z.string().optional(),
    });

    // 如果需要修改密码，则添加密码相关字段验证
    if (isChangingPassword) {
      return baseSchema
        .extend({
          newPassword: z.string().min(2, {
            message: "新密码必须至少包含2个字符",
          }),
          confirmPassword: z.string().min(2, {
            message: "确认密码必须至少包含2个字符",
          }),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: "新密码和确认密码不一致",
          path: ["confirmPassword"],
        })
        .refine(
          (data) => {
            // 用户必须至少修改名称、账号或密码其中之一
            return (
              data.name ||
              data.account ||
              (data.newPassword && data.newPassword !== data.password)
            );
          },
          {
            message: "请至少修改一项信息",
            path: ["name"],
          },
        );
    }

    // 非密码修改模式下，确保用户至少修改了一项
    return baseSchema.refine(
      (data) => {
        return data.name || data.account;
      },
      {
        message: "请至少修改美甲师姓名或账号",
        path: ["name"],
      },
    );
  };

  const router = useRouter();
  const session=useAdminSession();
  const [profile,setProfile]=useState<{id:string;username:string;memberType:string;name:string}|null>(null);
  const currentUser=useMemo(()=>profile||(session?{...session,name:session.nailArtistName||session.username}:null),[profile,session]);

  const formSchema = createFormSchema(isChangingPassword);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      name: "",
      account: "",
      password: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  // 当切换密码修改模式时，更新验证规则
  useEffect(() => {
    form.clearErrors();
  }, [isChangingPassword, form]);

  // 权限检查
  useEffect(() => {
    if (currentUser) {
      // 检查用户权限，如果不是 manager 或 staff 则返回首页
      if (!["staff","manager"].includes(currentUser.memberType) || currentUser.username==="beavernail") {
        toast.error("管理员账号请通过管理员配置修改", {
          position: "top-right",
        });
        router.push("/");
      }
    }
  }, [currentUser, router]);

  const handleChangeProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const formValues = form.getValues();
      const requestData: RequestData = {
        id: currentUser?.id,
        oldPassword: formValues.password, // 对应后端的 oldPassword
      };

      // 只添加用户填写的字段
      if (formValues.name) {
        requestData.name = formValues.name;
      } else if (currentUser) {
        // 如果用户没有输入姓名，使用当前用户的姓名
        requestData.name = currentUser.name;
      }

      if (formValues.account) {
        requestData.account = formValues.account;
      } else if (currentUser) {
        // 如果用户没有输入账号，使用当前用户的账号
        requestData.account = currentUser.username;
      }

      // 如果是修改密码模式，添加密码相关字段
      if (isChangingPassword) {
        requestData.newPassword = formValues.newPassword;
        requestData.confirmPassword = formValues.confirmPassword;
      } else {
        // 非修改密码模式，使用当前密码作为新密码（不变）
        requestData.newPassword = formValues.password;
        requestData.confirmPassword = formValues.password;
      }

      const result = await axios.post(
        "/api/auth/changeNailArtistInfo",
        requestData,
      );

      if (result.data.success) {
        // 更新本地存储的 token 和用户信息
        localStorage.setItem("accessToken", result.data.accessToken);
        localStorage.setItem("refreshToken", result.data.refreshToken);
        localStorage.setItem("user", JSON.stringify(result.data.user));

        toast.success("美甲师信息更新成功", {
          position: "top-right",
          style: {
            background: "#FFC0CB",
            color: "#FF1493",
            border: "2px solid #FF69B4",
            borderRadius: "12px",
            fontWeight: "bold",
          },
          icon: "🌸",
        });
        // 重置表单
        form.reset({
          name: "",
          account: "",
          password: "",
          newPassword: "",
          confirmPassword: "",
        });
        // 更新本地状态中的用户信息
        setProfile({
          id: result.data.user.id,
          username: result.data.user.account,
          memberType: result.data.user.memberType,
          name: result.data.user.name,
        });
      } else {
        toast.error(result.data.error || "更新失败", {
          position: "top-right",
          style: {
            background: "#FFE4E1",
            color: "#FF1493",
            border: "2px solid #FF69B4",
            borderRadius: "12px",
            fontWeight: "bold",
          },
          icon: "🌟",
        });
      }
    } catch (error: unknown) {
      console.error("更新美甲师信息失败:", error);

      // 使用类型断言处理错误对象
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(axiosError.response?.data?.error || "更新失败，请稍后再试", {
        position: "top-right",
        style: {
          background: "#FFE4E1",
          color: "#FF1493",
          border: "2px solid #FF69B4",
          borderRadius: "12px",
          fontWeight: "bold",
        },
        icon: "🌟",
      });
    } finally {
      setSaving(false);
    }
  };

  function onSubmit() {
    void handleChangeProfile();
  }

  return (
    <div>
      <PageHeading
        eyebrow="YOUR LITTLE CORNER"
        title="我的账号"
        description="更新姓名、登录账号或密码。修改前需要验证当前密码。"
      />
      <section className="admin-panel account-form-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>账号资料</h2>
            <p>
              {currentUser?.name} · {currentUser?.username}
            </p>
          </div>
          <ShieldCheck size={23} className="text-purple-300" />
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="admin-form-grid">
              {(
                [
                  {
                    name: "name",
                    label: "员工姓名",
                    placeholder: currentUser?.name || "输入新的姓名",
                  },
                  {
                    name: "account",
                    label: "登录账号",
                    placeholder: currentUser?.username || "输入新的账号",
                  },
                  {
                    name: "password",
                    label: "当前密码",
                    placeholder: "输入当前密码以验证身份",
                    type: "password",
                  },
                ] as const
              ).map((item) => (
                <FormField
                  key={item.name}
                  control={form.control}
                  name={item.name}
                  render={({ field }) => (
                    <FormItem className="admin-field">
                      <FormLabel>{item.label}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={item.placeholder}
                          type={"type" in item ? item.type : "text"}
                          autoComplete={
                            "type" in item ? "current-password" : "off"
                          }
                          disabled={saving}
                        />
                      </FormControl>
                      {item.name !== "password" && (
                        <small>可选，留空保持当前资料。</small>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <div className="profile-password-switch">
              <Switch
                id="password-change-mode"
                checked={isChangingPassword}
                onCheckedChange={setIsChangingPassword}
                disabled={saving}
              />
              <label htmlFor="password-change-mode">同时修改登录密码</label>
            </div>
            {isChangingPassword && (
              <div className="admin-form-grid">
                {(
                  [
                    { name: "newPassword", label: "新密码" },
                    { name: "confirmPassword", label: "再次确认新密码" },
                  ] as const
                ).map((item) => (
                  <FormField
                    key={item.name}
                    control={form.control}
                    name={item.name}
                    render={({ field }) => (
                      <FormItem className="admin-field">
                        <FormLabel>{item.label}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            autoComplete="new-password"
                            disabled={saving}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            )}
            <div className="schedule-footer">
              <span className="admin-subtle">妥善保管你的员工登录账号。</span>
              <Button type="submit" disabled={saving}>
                {saving ? "正在保存…" : "保存账号资料"}
              </Button>
            </div>
          </form>
        </Form>
      </section>
    </div>
  );
}
