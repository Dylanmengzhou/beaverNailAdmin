"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Home() {

	const [isMobile, setIsMobile] = useState(false);
	const router = useRouter();
	const [checkingAuth, setCheckingAuth] = useState(true)
	const [showDropdown, setShowDropdown] = useState(false);
	const buttonRef = useRef<HTMLDivElement>(null);
	const [buttonOpacity, setButtonOpacity] = useState(1); // 1为完全不透明
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const [currentUser, setCurrentUser] = useState<{ username: string, memberType: string } | null>(null);

	// 格式化日期函数
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const koreaDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
		const year = koreaDate.getUTCFullYear();
		const month = String(koreaDate.getUTCMonth() + 1).padStart(
			2,
			"0"
		);
		const day = String(koreaDate.getUTCDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	// API 返回的数据类型
	type ApiReservation = {
		name: string | null;
		email: string | null;
		provider: string | null;
		id: string;
		date: string;
		timeSlot: string;
		nailArtist?: string; // 添加美甲师字段
	};

	// Event 显示的数据类型
	type EventData = {
		user: string;
		timeslot: string;
		contact: string;
		date: string;
		reservationId: string;
		provider: string;
		nailArtist?: string; // 添加美甲师字段
	};

	// 状态管理
	const [apiReservations, setApiReservations] = useState<
		ApiReservation[]
	>([]);

	// 获取预约数据
	const handleGetReservation = async () => {
		try {
			// 如果没有用户信息，不执行请求
			if (!currentUser) return;

			const response = await fetch("/api/getNewReservation", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});
			const data = await response.json();

			if (data.success && Array.isArray(data.message)) {
				// 根据用户类型过滤预约
				let filteredReservations = data.message;

				// 如果是staff，只显示分配给自己的预约
				if (currentUser.memberType === 'staff') {
					filteredReservations = data.message.filter(
						(reservation: ApiReservation) => reservation.nailArtist === currentUser.username
					);
				}

				setApiReservations(filteredReservations);
				console.log("成功获取预约数据:", filteredReservations.length);
				toast.success(`成功获取预约数据: ${filteredReservations.length}`, {
					position: "top-center",
					duration: 1000,
				});
			} else {
				console.error("获取预约数据失败:", data.message);
				alert("获取预约数据失败");
			}
		} catch (error) {
			console.error("获取预约数据出错:", error);
			alert("获取预约数据出错");
		}
	};

	// 页面加载时检测设备 + 拉取预约
	useEffect(() => {
		const checkIfMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkIfMobile();
		window.addEventListener("resize", checkIfMobile);
		if (!checkingAuth) {
			// 登录检查完了，再拉预约数据
			handleGetReservation()
		}

		return () => {
			window.removeEventListener("resize", checkIfMobile);
		};
	}, [checkingAuth, currentUser]);

	useEffect(() => {
		const token = localStorage.getItem('accessToken')
		if (!token) {
			router.push('/')
		} else {
			// 解析JWT获取用户信息
			try {
				const tokenParts = token.split('.');
				if (tokenParts.length === 3) {
					const payload = JSON.parse(atob(tokenParts[1]));
					setCurrentUser({
						username: payload.username,
						memberType: payload.memberType
					});
				}
			} catch (error) {
				console.error("解析token失败:", error);
			}
			setCheckingAuth(false) // 有token，认证通过
		}
	}, [])

	// 把 API 数据转成 Calendar 需要的格式
	const apiEventsData: EventData[] = apiReservations.map(
		(reservation) => {
			const hour = parseInt(reservation.timeSlot);
			// 只显示几点开始，不显示结束时间
			const formattedTimeSlot = `${hour}:00`;

			return {
				user: reservation.name ?? "未知用户",
				timeslot: formattedTimeSlot,
				contact: reservation.email ?? "无联系方式",
				date: formatDate(reservation.date),
				reservationId: reservation.id,
				provider: reservation.provider ?? "credentials",
				nailArtist: reservation.nailArtist,
			};
		}
	);

	// 获取provider对应的背景颜色
	const getProviderBgColor = (provider: string): string => {
		switch (provider) {
			case "wechat":
				return "bg-green-500";
			case "google":
				return "bg-blue-500";
			case "kakao":
				return "bg-yellow-500";
			case "credentials":
			default:
				return "bg-pink-500";
		}
	};

	// 渲染事件内容
	const renderEventContent = (eventInfo: {
		event: {
			extendedProps: {
				user: string;
				timeslot: string;
				contact: string;
				reservationId: string;
				provider: string;
				nailArtist?: string;
			};
		};
	}) => {
		const { user, timeslot, contact, reservationId, provider, nailArtist } =
			eventInfo.event.extendedProps;

		const handleClick = () => {
			router.push(`/reservation/${reservationId}`);
		};

		const providerBgColor = getProviderBgColor(provider);

		return (
			<div
				className={`flex flex-col text-xs p-1 rounded-md ${providerBgColor} text-white`}
				onClick={handleClick}
				style={{ cursor: "pointer" }}
			>
				{isMobile ? (
					<div className="flex flex-col space-y-1 p-0 justify-center items-center">
						<div className="font-bold text-[10px] truncate w-full text-center">
							{user}
						</div>
						<div className="font-medium text-[8px]">
							{timeslot}
						</div>
						{currentUser?.memberType === 'manager' && nailArtist && (
							<div className="font-medium text-[8px] bg-white/30 px-1 rounded">
								{nailArtist}
							</div>
						)}
					</div>
				) : (
					<>
						<div className="flex justify-between">
							<div className="font-semibold truncate mr-1">{user}</div>
							<div>{timeslot}</div>
						</div>
						<div className="flex justify-between">
							<div className="truncate mr-1">{contact}</div>
							<div className="text-[10px]">
								{reservationId.substring(0, 6)}
							</div>
						</div>
						{currentUser?.memberType === 'manager' && nailArtist && (
							<div className="text-[10px] bg-white/30 px-1 rounded mt-1 text-center">
								美甲师: {nailArtist}
							</div>
						)}
					</>
				)}
			</div>
		);
	};

	// 生成 FullCalendar 的 events
	const sampleEvents = apiEventsData.map((event) => ({
		title: "",
		date: event.date,
		extendedProps: {
			user: event.user,
			timeslot: event.timeslot,
			contact: event.contact,
			reservationId: event.reservationId,
			provider: event.provider,
			nailArtist: event.nailArtist,
		},
	}));

	// 处理鼠标移入按钮
	const handleMouseEnter = () => {
		// 清除之前的定时器（如果有）
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		// 设置按钮为不透明
		setButtonOpacity(1);
	};

	// 处理鼠标移出按钮
	const handleMouseLeave = () => {
		// 如果下拉菜单没有显示，则设置定时器在2秒后降低透明度
		if (!showDropdown) {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			timerRef.current = setTimeout(() => {
				setButtonOpacity(0.2);
			}, 2000);
		}
	};

	// 处理点击按钮
	const handleButtonClick = () => {
		// 设置按钮为不透明
		setButtonOpacity(1);
		// 切换下拉菜单状态
		setShowDropdown(!showDropdown);

		// 如果关闭了菜单，重新开始定时器
		if (showDropdown) {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			timerRef.current = setTimeout(() => {
				setButtonOpacity(0.2);
			}, 2000);
		}
	};

	// 设置初始定时器
	useEffect(() => {
		// 初始设置定时器，2秒后降低透明度
		timerRef.current = setTimeout(() => {
			setButtonOpacity(0.2);
		}, 2000);

		// 清理函数
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	// 当下拉菜单状态改变时的效果
	useEffect(() => {
		// 如果菜单关闭且不在按钮上悬停，设置定时器
		if (!showDropdown) {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			timerRef.current = setTimeout(() => {
				setButtonOpacity(0.2);
			}, 2000);
		} else {
			// 如果菜单打开，取消定时器并保持按钮不透明
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			setButtonOpacity(1);
		}
	}, [showDropdown]);

	if (checkingAuth) {
		return <div className="w-full h-svh flex justify-center items-center">加载中...</div> // 认证状态还没检查完
	}

	return (
		<div className="flex flex-col h-svh justify-center items-center calendar-container">
			<div className="w-full relative">
				{/* Y2K风格固定按钮 - 右上角 */}
				<div
					ref={buttonRef}
					className="fixed top-4 right-4 z-[9999] transition-opacity duration-700"
					style={{ opacity: buttonOpacity }}
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
					onTouchStart={handleMouseEnter}
				>
					{/* 按钮 */}
					<div className="flex flex-col items-center">
						{/* Y2K风格按钮 */}
						<button
							onClick={handleButtonClick}
							className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-pink-400 to-purple-300 border-none shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
							style={{
								boxShadow: '0 0 15px rgba(255, 105, 180, 0.7)',
							}}
						>
							<div className="text-white text-2xl font-bold">≡</div>
						</button>
					</div>

					{/* Y2K风格下拉菜单 */}
					{showDropdown && (
						<div
							className="absolute top-16 right-0 z-50 rounded-2xl overflow-hidden border-none"
							style={{
								width: '220px',
								background: 'linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%)',
								boxShadow: '0 0 20px rgba(255, 105, 180, 0.5)',
							}}
						>
							<div className="px-4 py-3 font-bold text-center text-pink-600 border-b-2 border-white bg-gradient-to-r from-pink-200 to-purple-200">
								✨ 日历操作菜单 ✨
							</div>

							<div className="p-1">
								{/* 显示当前用户信息 */}
								<div className="px-4 py-2 my-1 flex items-center justify-center gap-2 bg-pink-50 rounded-lg">
									<span className="font-medium text-pink-800">
										{currentUser?.username} ({currentUser?.memberType === 'manager' ? '管理员' : '员工'})
									</span>
								</div>

								<div
									className="px-4 py-3 my-1 flex items-center gap-2 hover:bg-pink-100 cursor-pointer rounded-lg transition-colors"
									onClick={() => {
										handleGetReservation();
										setShowDropdown(false);
									}}
								>
									<div className="w-8 h-8 flex items-center justify-center rounded-full bg-pink-400 text-white">
										↻
									</div>
									<span className="font-medium text-pink-800">刷新预约数据</span>
								</div>

								{/* <div className="border-t-2 border-white my-2"></div> */}

								<div
									className="px-4 py-3 my-1 flex items-center gap-2 hover:bg-pink-100 cursor-pointer rounded-lg transition-colors"
									onClick={() => {
										localStorage.removeItem('accessToken');
										router.push('/');
										setShowDropdown(false);
									}}
								>
									<div className="w-8 h-8 flex items-center justify-center rounded-full bg-red-400 text-white">
										←
									</div>
									<span className="font-medium text-pink-800">退出登录</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* 点击其他区域关闭下拉菜单 */}
				{showDropdown && (
					<div
						className="fixed inset-0 z-[9998]"
						onClick={() => setShowDropdown(false)}
					></div>
				)}

				<FullCalendar
					plugins={[dayGridPlugin, interactionPlugin]}
					initialView="dayGridMonth"
					weekends={true}
					locale={"zh-cn"}
					headerToolbar={
						isMobile
							? {
								left: "prev,next",
								center: "title",
								right: "today,myRefreshButton",
							}
							: {
								left: "prev,next today myRefreshButton",
								center: "title",
								right: "dayGridMonth,dayGridWeek,dayGridDay",
							}
					}
					customButtons={{
						myRefreshButton: {
							text: "刷新",
							click: handleGetReservation,
						}
					}}
					titleFormat={{
						year: "numeric",
						month: "long",
					}}
					events={sampleEvents}
					eventContent={renderEventContent}
					height="auto"
					contentHeight="auto"
					dayMaxEventRows={isMobile ? 5 : true}
					moreLinkClick="popover"
					fixedWeekCount={false}
					stickyHeaderDates={true}
				/>
			</div>
		</div>
	);
}
