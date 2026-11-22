import { mount } from "svelte";
import TasksView from "./TasksView.svelte";
import "./styles.css";
import "../lib/styles.css";

mount(TasksView, { target: document.body.firstElementChild! });
