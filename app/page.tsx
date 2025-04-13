"use client";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const LoginPage = () => {
    const [checkingAuth, setCheckingAuth] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        if (token) {
            router.push('/calendar')
        }
    }, [])
    const router = useRouter();
    const credentialsAction = async (formData: FormData) => {
        const username = formData.get("username");
        const password = formData.get("password");
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            router.push("/calendar")

        } else {
            alert(data.error);
        }
    };
    return (
        <div className="w-svw h-svh flex items-center justify-center">
            <Card className="w-[350px]">
                <CardHeader className="flex flex-col justify-center items-center">
                    <CardTitle className="text-2xl">欢迎回来</CardTitle>
                    <CardDescription>Beaver Nail 登录系统</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={credentialsAction}>
                        <div className="grid w-full items-center gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="username">账号</Label>
                                <Input
                                    id="username"
                                    name="username"
                                    placeholder="请输入账号"
                                />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="password">密码</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="请输入密码"
                                />
                            </div>
                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    className="w-full bg-black text-white"
                                >
                                    登录
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center items-center"></CardFooter>
            </Card>
        </div>
    );
};

export default LoginPage;
