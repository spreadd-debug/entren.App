import { StudentRepository } from "../repositories/StudentRepository"

export const StudentService = {

  async getStudents() {

    const students = await StudentRepository.getAll()

    return students

  }

}