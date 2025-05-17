"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { SiSharp } from "react-icons/si";
import { IoExtensionPuzzle } from "react-icons/io5";
import { SiSmugmug } from "react-icons/si";
import { TbChessQueenFilled } from "react-icons/tb";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Switch } from "@/components/ui/switch";
import { Resolver } from "react-hook-form";

export default function ChangeProfilePage() {
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
          }
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
      }
    );
  };

  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    memberType: string;
    name: string;
  } | null>(null);

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

  // 认证和权限检查
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      // 解析JWT获取用户信息
      const tokenParts = token.split(".");
      if (tokenParts.length === 3) {
        const base64Url = tokenParts[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const payload = JSON.parse(jsonPayload);
        setCurrentUser({
          id: payload.id,
          username: payload.username,
          memberType: payload.memberType,
          name: payload.nailArtistName,
        });
      }
    } catch (error) {
      console.error("解析token失败:", error);
      router.push("/");
    }
  }, [router]);

  // 权限检查
  useEffect(() => {
    if (currentUser) {
      // 检查用户权限，如果不是 manager 或 staff 则返回首页
      if (!["staff"].includes(currentUser.memberType)) {
        toast.error("只有员工才能更改账号信息", {
          position: "top-right",
        });
        router.push("/");
      }
    }
  }, [currentUser, router]);

  const handleChangeProfile = async () => {
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
        requestData
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
        setCurrentUser({
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
    }
  };

  function onSubmit(values: FormValues) {
    console.log(values);
    handleChangeProfile();
  }

  // Y2K风格样式
  const y2kStyle = {
    background:
      "linear-gradient(135deg, #FFD1DC 0%, #FFB6C1 25%, #FFC0CB 50%, #FF69B4 75%, #FF1493 100%)",
    borderRadius: "20px",
    boxShadow:
      "0 8px 32px rgba(255, 105, 180, 0.3), 0 4px 16px rgba(255, 20, 147, 0.2)",
    border: "3px solid rgba(255, 255, 255, 0.4)",
  };

  const inputStyle = {
    background: "rgba(255, 255, 255, 0.7)",
    border: "2px solid #FF69B4",
    borderRadius: "12px",
    fontFamily: "'Comic Sans MS', cursive",
    color: "#FF1493",
    transition: "all 0.3s ease",
  };

  const labelStyle = {
    fontFamily: "'Comic Sans MS', cursive",
    color: "#FF1493",
    fontWeight: "bold" as const,
    textShadow: "1px 1px 2px rgba(255, 255, 255, 0.7)",
  };

  const buttonStyle = {
    background: "linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)",
    borderRadius: "30px",
    border: "2px solid white",
    boxShadow: "0 4px 20px rgba(255, 20, 147, 0.5)",
    fontFamily: "'Comic Sans MS', cursive",
    fontWeight: "bold" as const,
    color: "white",
    transition: "all 0.3s ease",
    padding: "10px 30px",
    fontSize: "1.1rem",
    letterSpacing: "1px",
  };

  return (
    <div
      className="min-h-svh py-8 w-full"
      style={{
        background:
          "linear-gradient(135deg, #FFC0CB 0%, #FFBBFF 50%, #FFCCFF 100%)",
        backgroundSize: "200% 200%",
        animation: "gradient 15s ease infinite",
      }}
    >
      <style jsx global>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes floating {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .sparkle {
          position: absolute;
          pointer-events: none;
          animation: floating 3s ease-in-out infinite;
        }

        .form-container {
          position: relative;
          z-index: 10;
        }

        .input-focus:focus {
          transform: scale(1.02);
          box-shadow: 0 0 15px rgba(255, 105, 180, 0.8);
        }

        .button-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(255, 20, 147, 0.6);
        }
      `}</style>

      <div className="flex flex-col items-center justify-center relative">
        {/* 装饰元素 */}
        <div className="sparkle" style={{ top: "10%", left: "10%" }}>
          <div style={{ fontSize: "40px" }}>✨</div>
        </div>
        <div
          className="sparkle"
          style={{ top: "15%", right: "15%", animationDelay: "0.5s" }}
        >
          <div style={{ fontSize: "30px" }}>💖</div>
        </div>
        <div
          className="sparkle"
          style={{ bottom: "20%", left: "20%", animationDelay: "1s" }}
        >
          <div style={{ fontSize: "35px" }}>🌸</div>
        </div>
        <div
          className="sparkle"
          style={{ bottom: "25%", right: "25%", animationDelay: "1.5s" }}
        >
          <div style={{ fontSize: "45px" }}>⭐</div>
        </div>

        <div className="form-container max-w-lg w-full px-4">
          <Card className="w-full shadow-xl" style={y2kStyle}>
            <CardHeader className="flex flex-col items-center">
              <div
                className="mb-4"
                style={{ animation: "floating 3s ease-in-out infinite" }}
              >
                <div
                  className="text-[#FF1493]"
                  style={{ fontSize: "60px", textAlign: "center" }}
                >
                  <SiSmugmug />
                </div>
              </div>
              <CardTitle
                className="text-3xl font-bold"
                style={{
                  fontFamily: "'Comic Sans MS', cursive",
                  color: "#FF1493",
                  textShadow: "2px 2px 4px rgba(255, 255, 255, 0.7)",
                  letterSpacing: "1px",
                }}
              >
                美甲师信息设置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={labelStyle}>
                          <span style={{ marginRight: "8px" }}>
                            <TbChessQueenFilled />
                          </span>
                          美甲师姓名
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              currentUser?.name || "输入新的美甲师姓名"
                            }
                            {...field}
                            className="input-focus"
                            style={inputStyle}
                          />
                        </FormControl>
                        <FormDescription
                          style={{ color: "#FF69B4", fontStyle: "italic" }}
                        >
                          输入新的美甲师姓名（可选）
                        </FormDescription>
                        <FormMessage
                          style={{ color: "#FF1493", fontWeight: "bold" }}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="account"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={labelStyle}>
                          <span style={{ marginRight: "8px" }}>
                            <SiSharp />
                          </span>
                          账号
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              currentUser?.username || "输入新的账号"
                            }
                            {...field}
                            className="input-focus"
                            style={inputStyle}
                          />
                        </FormControl>
                        <FormDescription
                          style={{ color: "#FF69B4", fontStyle: "italic" }}
                        >
                          输入新的登录账号（可选）
                        </FormDescription>
                        <FormMessage
                          style={{ color: "#FF1493", fontWeight: "bold" }}
                        />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel style={labelStyle}>
                          <span style={{ marginRight: "8px" }}>
                            <IoExtensionPuzzle />
                          </span>
                          当前密码
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="输入当前密码"
                            {...field}
                            className="input-focus"
                            style={inputStyle}
                          />
                        </FormControl>
                        <FormMessage
                          style={{ color: "#FF1493", fontWeight: "bold" }}
                        />
                      </FormItem>
                    )}
                  />

                  <div
                    className="flex items-center space-x-2 p-3 rounded-lg"
                    style={{
                      background: "rgba(255, 255, 255, 0.4)",
                      border: "2px dashed #FF69B4",
                      borderRadius: "15px",
                    }}
                  >
                    <div className="switch-container">
                      <Switch
                        className=""
                        checked={isChangingPassword}
                        onCheckedChange={setIsChangingPassword}
                        id="password-change-mode"
                      />
                    </div>
                    <label
                      htmlFor="password-change-mode"
                      style={{
                        fontFamily: "'Comic Sans MS', cursive",
                        color: "#FF1493",
                        fontWeight: "bold",
                      }}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      <span style={{ marginRight: "8px" }}>✨</span>
                      修改密码
                    </label>
                  </div>

                  {isChangingPassword && (
                    <div
                      className="space-y-6 p-4 rounded-lg animate-in fade-in"
                      style={{
                        background: "rgba(255, 192, 203, 0.3)",
                        borderRadius: "15px",
                        border: "2px dashed #FF69B4",
                      }}
                    >
                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel style={labelStyle}>
                              <span style={{ marginRight: "8px" }}></span>
                              新密码
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="输入新密码"
                                {...field}
                                className="input-focus"
                                style={inputStyle}
                              />
                            </FormControl>
                            <FormMessage
                              style={{ color: "#FF1493", fontWeight: "bold" }}
                            />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel style={labelStyle}>
                              <span style={{ marginRight: "8px" }}></span>
                              确认密码
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="再次输入新密码"
                                {...field}
                                className="input-focus"
                                style={inputStyle}
                              />
                            </FormControl>
                            <FormMessage
                              style={{ color: "#FF1493", fontWeight: "bold" }}
                            />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  <div className="pt-4 flex justify-center">
                    <Button
                      type="submit"
                      className="button-hover"
                      style={buttonStyle}
                    >
                      <span style={{ marginRight: "8px" }}>✨</span>
                      提交更改
                      <span style={{ marginLeft: "8px" }}>✨</span>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
